import * as Notifications from 'expo-notifications';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { analyseNoteWithAI } from '../services/aiNoteService';
import { supabase } from '../services/supabase';
import { detectCategory } from '../utils/categoryUtils';
import { detectSmartReminder } from '../utils/smartReminderUtils';
import { useAuth } from './AuthContext';

export type Note = {
  id: string;
  title: string;
  text: string;
  createdAt: string;
  createdAtIso: string;
  type: 'note' | 'reminder';
  reminderAt?: string;
  notifyAt?: string;
  category: 'idee' | 'tache' | 'rappel' | 'personnel' | 'autre';
  reminderAtIso?: string;
  notifyAtIso?: string;
  notificationId?: string;
  isImportant: boolean;
  isDone: boolean;
};

type NotesContextValue = {
  note: string;
  setNote: (text: string) => void;
  notes: Note[];
  saving: boolean;
  addNote: () => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  toggleImportant: (id: string) => Promise<void>;
  scheduledReminders: Note[];
  pendingNotes: Note[];
};

type DetectedReminder = {
  reminderDate: Date;
  notifyDate: Date;
};

const NotesContext = createContext<NotesContextValue | null>(null);

const TITLE_MAX_WORDS = 6;

const TITLE_EMOJI_RULES: Array<{
  emoji: string;
  words: string[];
}> = [
  {
    emoji: '📞',
    words: ['appeler', 'appel', 'téléphoner', 'contacter'],
  },
  {
    emoji: '📄',
    words: [
      'document',
      'documentation',
      'dossier',
      'rapport',
      'pdf',
      'contrat',
      'courrier',
    ],
  },
  {
    emoji: '🌐',
    words: [
      'domaine',
      'site',
      'internet',
      'netlify',
      'fly',
      'supabase',
      'déployer',
      'déploiement',
    ],
  },
  {
    emoji: '🛒',
    words: [
      'acheter',
      'courses',
      'lait',
      'pain',
      'magasin',
      'commande',
    ],
  },
  {
    emoji: '💡',
    words: ['idée', 'imaginer', 'concept', 'améliorer'],
  },
  {
    emoji: '💼',
    words: ['travail', 'lidl', 'snpt', 'réunion', 'client'],
  },
  {
    emoji: '💻',
    words: [
      'code',
      'coder',
      'application',
      'backend',
      'frontend',
      'bug',
      'corriger',
    ],
  },
  {
    emoji: '📅',
    words: [
      'rendez-vous',
      'réunion',
      'planning',
      'prévoir',
      'réserver',
    ],
  },
  {
    emoji: '💳',
    words: [
      'payer',
      'paiement',
      'facture',
      'banque',
      'argent',
      'budget',
    ],
  },
  {
    emoji: '🏠',
    words: ['maison', 'famille', 'rachel', 'enfant', 'papa', 'maman'],
  },
];

function detectReminderTime(text: string): DetectedReminder | null {
  const match = text.match(/(\d{1,2})\s?h(?:\s?(\d{1,2}))?/i);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const reminderDate = new Date();
  reminderDate.setHours(hour, minute, 0, 0);

  if (reminderDate.getTime() <= Date.now()) {
    reminderDate.setDate(reminderDate.getDate() + 1);
  }

  return {
    reminderDate,
    notifyDate: resolveNotifyDate(reminderDate),
  };
}

function resolveNotifyDate(reminderDate: Date) {
  const now = Date.now();
  const tenMinutesBefore =
    reminderDate.getTime() - 10 * 60 * 1000;

  if (tenMinutesBefore > now) {
    return new Date(tenMinutesBefore);
  }

  return new Date(reminderDate);
}

function isValidFutureDate(date: Date) {
  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() > Date.now()
  );
}

async function cancelLegacyPersonalReminderNotifications() {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    const personalReminderIds = scheduledNotifications
      .filter((notification) => {
        return (
          notification.content.data?.kind ===
          'personal_reminder'
        );
      })
      .map((notification) => notification.identifier);

    await Promise.all(
      personalReminderIds.map((identifier) =>
        Notifications.cancelScheduledNotificationAsync(
          identifier
        )
      )
    );

    console.log(
      `${personalReminderIds.length} ancien(s) rappel(s) local(aux) annulé(s).`
    );
  } catch (error) {
    console.warn(
      "Impossible d'annuler les anciens rappels locaux :",
      error
    );
  }
}

async function cancelDailyNotifications() {
  if (Platform.OS === 'web') {
    return;
  }

  const existingNotifications =
    await Notifications.getAllScheduledNotificationsAsync();

  const dailyNotificationIds = existingNotifications
    .filter((notification) => {
      const kind = notification.content.data?.kind;

      return (
        kind === 'daily_morning' ||
        kind === 'daily_evening'
      );
    })
    .map((notification) => notification.identifier);

  await Promise.all(
    dailyNotificationIds.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(
        identifier
      )
    )
  );
}

function detectTitleEmoji(text: string) {
  const lowerText = text.toLowerCase();

  const matchedRule = TITLE_EMOJI_RULES.find(
    ({ words }) =>
      words.some((word) => lowerText.includes(word))
  );

  return matchedRule?.emoji ?? '📝';
}

function removeReminderDetails(text: string) {
  return text
    .replace(
      /\b(aujourd['’]?hui|demain|après-demain|ce soir|ce matin|cet après-midi)\b/gi,
      ' '
    )
    .replace(
      /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(\s+prochain)?\b/gi,
      ' '
    )
    .replace(/\bdans\s+\d+\s+(minute|heure|jour|semaine|mois)s?\b/gi, ' ')
    .replace(/\bavant\s+\w+\b/gi, ' ')
    .replace(/\b(le|pour)\s+\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/gi, ' ')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b(à|vers)\s+\d{1,2}\s?h(?:\s?\d{1,2})?\b/gi, ' ')
    .replace(/\b\d{1,2}:\d{2}\b/g, ' ');
}

function removeTitleIntroductions(text: string) {
  return text
    .replace(
      /^(je dois|il faut|penser à|pense à|ne pas oublier de|n['’]oublie pas de|rappelle-moi de|rappelle moi de|j['’]ai besoin de|je veux|je voudrais)\s+/i,
      ''
    )
    .replace(/^(prévoir de|prévoir|faire|finir de)\s+/i, (match) =>
      match.toLowerCase().startsWith('finir')
        ? 'Finir '
        : ''
    );
}

function capitalizeTitle(text: string) {
  if (!text) {
    return '';
  }

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function generateFallbackTitle(text: string) {
  const emoji = detectTitleEmoji(text);

  const cleanedText = removeTitleIntroductions(
    removeReminderDetails(text)
  )
    .replace(/[.,;:!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanedText) {
    return `${emoji} Nouvelle note`;
  }

  const words = cleanedText.split(/\s+/);
  const shortened = words
    .slice(0, TITLE_MAX_WORDS)
    .join(' ');

  return `${emoji} ${capitalizeTitle(shortened)}`;
}

function normalizeGeneratedTitle(
  title: unknown,
  originalText: string
) {
  if (typeof title !== 'string') {
    return generateFallbackTitle(originalText);
  }

  const cleanedTitle = title
    .replace(/[\r\n]+/g, ' ')
    .replace(/^["'«»]+|["'«»]+$/g, '')
    .replace(/[.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanedTitle) {
    return generateFallbackTitle(originalText);
  }

  const normalizedOriginal = originalText
    .trim()
    .toLowerCase();

  const normalizedTitle = cleanedTitle.toLowerCase();

  if (
    normalizedTitle === normalizedOriginal ||
    cleanedTitle.length > 70
  ) {
    return generateFallbackTitle(originalText);
  }

  const words = cleanedTitle.split(/\s+/);
  const shortenedTitle = words
    .slice(0, TITLE_MAX_WORDS + 1)
    .join(' ');

  const startsWithEmoji =
    /^\p{Extended_Pictographic}/u.test(
      shortenedTitle
    );

  if (startsWithEmoji) {
    return shortenedTitle;
  }

  return `${detectTitleEmoji(originalText)} ${shortenedTitle}`;
}

function generateNoteId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export function NotesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [saving, setSaving] = useState(false);

  const { user, session } = useAuth();
  
  useEffect(() => {
    if (!user) {
      return;
    }

    void Promise.all([
      cancelLegacyPersonalReminderNotifications(),
      cancelDailyNotifications(),
    ]);
  }, [user]);

  const saveNoteToSupabase = useCallback(
    async (item: Note) => {
      if (!user) {
        return;
      }

      const { error } = await supabase
        .from('notes')
        .upsert({
          id: item.id,
          user_id: user.id,

          title: item.title,
          text: item.text,

          created_at: item.createdAt,
          created_at_iso: item.createdAtIso,

          type: item.type,
          category: item.category,

          reminder_at: item.reminderAt ?? null,
          notify_at: item.notifyAt ?? null,

          reminder_at_iso:
            item.reminderAtIso ?? null,
          notify_at_iso:
            item.notifyAtIso ?? null,

          notification_id:
            item.notificationId ?? null,

          is_important: item.isImportant,
          is_done: item.isDone,
        });

      if (error) {
        console.error(
          "Erreur pendant l'enregistrement de la note :",
          error.message
        );
      }
    },
    [user]
  );

  const loadNotes = useCallback(async () => {
    if (!user) {
      setNotes([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at_iso', {
          ascending: false,
        });

      if (error) {
        console.error(
          'Erreur pendant le chargement des notes :',
          error.message
        );

        setNotes([]);
        return;
      }

      const formattedNotes: Note[] =
        data?.map((item) => ({
          id: item.id,

          title: normalizeGeneratedTitle(
            item.title,
            item.text
          ),

          text: item.text,
          createdAt: item.created_at,
          createdAtIso: item.created_at_iso,
          type: item.type,
          category: item.category,

          reminderAt:
            item.reminder_at ?? undefined,
          notifyAt:
            item.notify_at ?? undefined,

          reminderAtIso:
            item.reminder_at_iso ?? undefined,
          notifyAtIso:
            item.notify_at_iso ?? undefined,

          notificationId:
            item.notification_id ?? undefined,

          isImportant: Boolean(
            item.is_important
          ),
          isDone: Boolean(item.is_done),
        })) ?? [];

      setNotes(formattedNotes);
    } catch (error) {
      console.error(
        'Erreur inattendue pendant le chargement des notes :',
        error
      );

      setNotes([]);
    }
  }, [user]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const addNote = useCallback(async () => {
    const cleanText = note.trim();

    if (!cleanText || saving || !user) {
      return;
    }

    setSaving(true);

    try {
      let aiAnalysis = null;

      try {
        if (session?.access_token) {
          aiAnalysis = await analyseNoteWithAI(
            cleanText,
            session.access_token
          );
        }
      } catch (error) {
        console.warn(
          "L'analyse IA a échoué. La détection locale sera utilisée.",
          error
        );
      }

      const aiHasTime =
  typeof aiAnalysis?.time === 'string' &&
  aiAnalysis.time.trim().length > 0;

const smartReminder = !aiHasTime
  ? detectSmartReminder(cleanText)
  : null;

let detected: DetectedReminder | null = null;

if (aiHasTime) {
  const resolvedDate =
    aiAnalysis?.date ||
    new Date().toISOString().split('T')[0];

  const resolvedTime = String(aiAnalysis?.time);

  const reminderDate = new Date(
    `${resolvedDate}T${resolvedTime}:00`
  );

  if (
    !aiAnalysis?.date &&
    reminderDate.getTime() <= Date.now()
  ) {
    reminderDate.setDate(
      reminderDate.getDate() + 1
    );
  }

  if (isValidFutureDate(reminderDate)) {
    detected = {
      reminderDate,
      notifyDate: resolveNotifyDate(reminderDate),
    };
  }
} else if (
  smartReminder &&
  isValidFutureDate(smartReminder)
) {
  /**
   * La détection locale est acceptée uniquement
   * lorsqu’une véritable heure apparaît dans le texte.
   */
  const localTimeDetected =
    /(\d{1,2})\s?h(?:\s?(\d{1,2}))?/i.test(
      cleanText
    ) ||
    /\b\d{1,2}:\d{2}\b/.test(cleanText);

  if (localTimeDetected) {
    detected = {
      reminderDate: smartReminder,
      notifyDate:
        resolveNotifyDate(smartReminder),
    };
  }
} else {
  detected = detectReminderTime(cleanText);
}

/**
 * Le rappel personnel est désormais envoyé
 * par le backend via Expo Push Token.
 *
 * Le frontend calcule et enregistre seulement
 * l'heure à laquelle le backend doit l'envoyer.
 */
const finalNotifyDate =
  detected?.notifyDate;

const now = new Date();

      const newNote: Note = {
        id: generateNoteId(),

        title: normalizeGeneratedTitle(
          aiAnalysis?.title,
          cleanText
        ),

        text: cleanText,

        createdAt: now.toLocaleTimeString(
          'fr-FR',
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        ),

        createdAtIso: now.toISOString(),

        type: detected ? 'reminder' : 'note',

        category:
          aiAnalysis?.category ??
          detectCategory(cleanText),

        reminderAt: detected
          ? detected.reminderDate.toLocaleTimeString(
              'fr-FR',
              {
                hour: '2-digit',
                minute: '2-digit',
              }
            )
          : undefined,

        notifyAt: finalNotifyDate
          ? finalNotifyDate.toLocaleTimeString(
              'fr-FR',
              {
                hour: '2-digit',
                minute: '2-digit',
              }
            )
          : undefined,

        reminderAtIso:
          detected?.reminderDate.toISOString(),

        notifyAtIso:
          finalNotifyDate?.toISOString(),

        notificationId: undefined,

        isImportant: false,
        isDone: false,
      };

      setNotes((currentNotes) => [
        newNote,
        ...currentNotes,
      ]);

      await saveNoteToSupabase(newNote);

      setNote('');
    } catch (error) {
      console.error(
        "Erreur pendant l'ajout de la note :",
        error
      );
    } finally {
      setSaving(false);
    }
  }, [
    note,
    saveNoteToSupabase,
    saving,
    user,
    session?.access_token,
  ]);

  const deleteNote = useCallback(
    async (id: string) => {
      const itemToDelete = notes.find(
        (item) => item.id === id
      );

      setNotes((current) =>
        current.filter(
          (item) => item.id !== id
        )
      );

      if (
        Platform.OS !== 'web' &&
        itemToDelete?.notificationId
      ) {
        try {
          await Notifications.cancelScheduledNotificationAsync(
            itemToDelete.notificationId
          );
        } catch (error) {
          console.warn(
            "Impossible d'annuler la notification supprimée :",
            error
          );
        }
      }

      if (!user) {
        return;
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error(
          'Erreur pendant la suppression de la note :',
          error.message
        );
      }
    },
    [notes, user]
  );

  const toggleDone = useCallback(
    async (id: string) => {
      const currentNote = notes.find(
        (item) => item.id === id
      );

      if (!currentNote || !user) {
        return;
      }

      const newValue = !currentNote.isDone;

      setNotes((currentNotes) =>
        currentNotes.map((item) =>
          item.id === id
            ? {
                ...item,
                isDone: newValue,
              }
            : item
        )
      );

      if (
        newValue &&
        Platform.OS !== 'web' &&
        currentNote.notificationId
      ) {
        try {
          await Notifications.cancelScheduledNotificationAsync(
            currentNote.notificationId
          );
        } catch (error) {
          console.warn(
            "Impossible d'annuler la notification terminée :",
            error
          );
        }
      }

      const { error } = await supabase
        .from('notes')
        .update({
          is_done: newValue,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error(
          'Erreur pendant la modification de la note :',
          error.message
        );
      }
    },
    [notes, user]
  );

  const toggleImportant = useCallback(
    async (id: string) => {
      const currentNote = notes.find(
        (item) => item.id === id
      );

      if (!currentNote || !user) {
        return;
      }

      const newValue =
        !currentNote.isImportant;

      setNotes((currentNotes) =>
        currentNotes.map((item) =>
          item.id === id
            ? {
                ...item,
                isImportant: newValue,
              }
            : item
        )
      );

      const { error } = await supabase
        .from('notes')
        .update({
          is_important: newValue,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error(
          'Erreur pendant la modification de l’importance :',
          error.message
        );
      }
    },
    [notes, user]
  );

  const scheduledReminders = useMemo(() => {
    const now = Date.now();

    return notes
      .filter((item) => {
        if (!item.reminderAtIso) {
          return false;
        }

        if (item.isDone) {
          return false;
        }

        const reminderTime = new Date(
          item.reminderAtIso
        ).getTime();

        return (
          !Number.isNaN(reminderTime) &&
          reminderTime > now
        );
      })
      .sort((a, b) => {
        const dateA = a.reminderAtIso
          ? new Date(
              a.reminderAtIso
            ).getTime()
          : 0;

        const dateB = b.reminderAtIso
          ? new Date(
              b.reminderAtIso
            ).getTime()
          : 0;

        return dateA - dateB;
      });
  }, [notes]);

  const pendingNotes = useMemo(() => {
    return notes
      .filter((item) => !item.isDone)
      .sort(
        (a, b) =>
          new Date(
            b.createdAtIso
          ).getTime() -
          new Date(
            a.createdAtIso
          ).getTime()
      );
  }, [notes]);

  return (
    <NotesContext.Provider
      value={{
        note,
        setNote,
        notes,
        saving,
        addNote,
        deleteNote,
        toggleDone,
        toggleImportant,
        scheduledReminders,
        pendingNotes,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);

  if (!context) {
    throw new Error(
      'useNotes doit être utilisé dans NotesProvider'
    );
  }

  return context;
}