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

/**
 * Détecte une heure simple dans une phrase :
 *
 * "appeler Rachel à 18h"
 * "rendez-vous à 14h30"
 */
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

  /**
   * Si l’heure est déjà passée aujourd’hui,
   * le rappel est programmé pour demain.
   */
  if (reminderDate.getTime() <= Date.now()) {
    reminderDate.setDate(reminderDate.getDate() + 1);
  }

  return {
    reminderDate,
    notifyDate: resolveNotifyDate(reminderDate),
  };
}

/**
 * On essaie de prévenir dix minutes avant.
 *
 * Si les dix minutes avant sont déjà passées,
 * la notification arrivera à l’heure exacte du rappel.
 */
function resolveNotifyDate(reminderDate: Date) {
  const now = Date.now();
  const tenMinutesBefore = reminderDate.getTime() - 10 * 60 * 1000;

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

async function notificationsAreAllowed() {
  if (Platform.OS === 'web') {
    return false;
  }

  const permissions = await Notifications.getPermissionsAsync();

  return permissions.granted || permissions.status === 'granted';
}

/**
 * Programme une notification locale sur le téléphone.
 */
async function scheduleReminderNotification(
  text: string,
  reminderDate: Date
): Promise<{
  notificationId: string;
  notifyDate: Date;
} | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!isValidFutureDate(reminderDate)) {
    console.warn(
      'Notification ignorée, car la date du rappel est invalide ou passée :',
      reminderDate
    );

    return null;
  }

  const allowed = await notificationsAreAllowed();

  if (!allowed) {
    console.warn(
      "La note sera enregistrée, mais les notifications ne sont pas autorisées."
    );

    return null;
  }

  const notifyDate = resolveNotifyDate(reminderDate);

  try {
    const notificationId =
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Daya',
          body: text,
          sound: 'default',
          data: {
            kind: 'personal_reminder',
            reminderAtIso: reminderDate.toISOString(),
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notifyDate,
          channelId: 'default',
        },
      });

    console.log('Notification locale programmée :', {
      notificationId,
      reminderDate: reminderDate.toISOString(),
      notifyDate: notifyDate.toISOString(),
      text,
    });

    return {
      notificationId,
      notifyDate,
    };
  } catch (error) {
    console.error(
      'Erreur pendant la programmation de la notification :',
      error
    );

    return null;
  }
}

function buildMorningText(notes: Note[]) {
  const now = Date.now();

  const upcomingReminders = notes
    .filter((item) => {
      if (item.isDone || !item.reminderAtIso) {
        return false;
      }

      const reminderTime = new Date(item.reminderAtIso).getTime();

      return !Number.isNaN(reminderTime) && reminderTime > now;
    })
    .sort((a, b) => {
      return (
        new Date(a.reminderAtIso!).getTime() -
        new Date(b.reminderAtIso!).getTime()
      );
    });

  if (upcomingReminders.length === 0) {
    return "Bonjour 👋 Aucun rappel à venir pour le moment.";
  }

  const firstReminders = upcomingReminders.slice(0, 3);

  const details = firstReminders
    .map((item) => {
      const date = new Date(item.reminderAtIso!);

      const day = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
      });

      const time = date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return `${item.text} — ${day} à ${time}`;
    })
    .join(' • ');

  const remainingCount =
    upcomingReminders.length - firstReminders.length;

  return remainingCount > 0
    ? `Bonjour 👋 Tes prochains rappels : ${details} • Et ${remainingCount} autre(s).`
    : `Bonjour 👋 Tes prochains rappels : ${details}`;
}


function buildEveningText(notes: Note[]) {
  const now = Date.now();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const doneToday = notes.filter((item) => {
    if (!item.isDone) {
      return false;
    }

    const creationTime = new Date(item.createdAtIso).getTime();

    return (
      !Number.isNaN(creationTime) &&
      creationTime >= todayStart.getTime() &&
      creationTime <= todayEnd.getTime()
    );
  }).length;

  const upcomingReminders = notes
    .filter((item) => {
      if (item.isDone || !item.reminderAtIso) {
        return false;
      }

      const reminderTime = new Date(item.reminderAtIso).getTime();

      return !Number.isNaN(reminderTime) && reminderTime > now;
    })
    .sort((a, b) => {
      return (
        new Date(a.reminderAtIso!).getTime() -
        new Date(b.reminderAtIso!).getTime()
      );
    });

  if (upcomingReminders.length === 0) {
    return `Bonsoir 👋 ${doneToday} élément(s) créés aujourd’hui sont terminés. Aucun rappel à venir.`;
  }

  const nextReminder = upcomingReminders[0];
  const nextDate = new Date(nextReminder.reminderAtIso!);

  const day = nextDate.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });

  const time = nextDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

   return `Bonsoir 👋 ${doneToday} élément(s) créés aujourd’hui sont terminés. ${upcomingReminders.length} rappel(s) à venir. Prochain : ${nextReminder.text} — ${day} à ${time}.`;
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
      Notifications.cancelScheduledNotificationAsync(identifier)
    )
  );
}

async function scheduleDailyNotifications(notes: Note[]) {
  if (Platform.OS === 'web') {
    return;
  }

  const allowed = await notificationsAreAllowed();

  if (!allowed) {
    return;
  }

  await cancelDailyNotifications();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daya',
      body: buildMorningText(notes),
      sound: 'default',
      data: {
        kind: 'daily_morning',
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
      channelId: 'default',
    },
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daya',
      body: buildEveningText(notes),
      sound: 'default',
      data: {
        kind: 'daily_evening',
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
      channelId: 'default',
    },
  });

  console.log(
    'Notifications quotidiennes programmées pour 8 h et 21 h.'
  );
}

function generateFallbackTitle(text: string) {
  const cleanText = text.trim();

  if (cleanText.length <= 45) {
    return cleanText;
  }

  return `${cleanText.slice(0, 45).trim()}…`;
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
  const [notesLoaded, setNotesLoaded] = useState(false);

  const { user, session } = useAuth();

  const saveNoteToSupabase = useCallback(
    async (item: Note) => {
      if (!user) {
        return;
      }

      const { error } = await supabase.from('notes').upsert({
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

        reminder_at_iso: item.reminderAtIso ?? null,
        notify_at_iso: item.notifyAtIso ?? null,

        notification_id: item.notificationId ?? null,

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
      setNotesLoaded(true);
      return;
    }

    setNotesLoaded(false);

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

          title:
            item.title?.trim() ||
            generateFallbackTitle(item.text),

          text: item.text,
          createdAt: item.created_at,
          createdAtIso: item.created_at_iso,
          type: item.type,
          category: item.category,

          reminderAt: item.reminder_at ?? undefined,
          notifyAt: item.notify_at ?? undefined,

          reminderAtIso: item.reminder_at_iso ?? undefined,
          notifyAtIso: item.notify_at_iso ?? undefined,

          notificationId: item.notification_id ?? undefined,

          isImportant: Boolean(item.is_important),
          isDone: Boolean(item.is_done),
        })) ?? [];

      setNotes(formattedNotes);
    } catch (error) {
      console.error(
        'Erreur inattendue pendant le chargement des notes :',
        error
      );

      setNotes([]);
    } finally {
      setNotesLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  /**
   * Les notifications de 8 h et 21 h sont recréées
   * seulement lorsque la liste de notes réellement chargée change.
   */
  useEffect(() => {
    if (!user || !notesLoaded) {
      return;
    }

    const timer = setTimeout(() => {
      void scheduleDailyNotifications(notes);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [notes, notesLoaded, user]);

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

      const smartReminder = !aiAnalysis
        ? detectSmartReminder(cleanText)
        : null;

      let detected: DetectedReminder | null = null;

      if (
        aiAnalysis?.type === 'reminder' &&
        aiAnalysis.date &&
        aiAnalysis.time
      ) {
        const reminderDate = new Date(
          `${aiAnalysis.date}T${aiAnalysis.time}:00`
        );

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
        detected = {
          reminderDate: smartReminder,
          notifyDate: resolveNotifyDate(smartReminder),
        };
      } else {
        detected = detectReminderTime(cleanText);
      }

      let scheduledNotification: {
        notificationId: string;
        notifyDate: Date;
      } | null = null;

      if (detected) {
        scheduledNotification =
          await scheduleReminderNotification(
            cleanText,
            detected.reminderDate
          );
      }

      /**
       * Même si Android refuse la notification,
       * la note reste un rappel dans l’application.
       */
      const finalNotifyDate = scheduledNotification?.notifyDate ??
        detected?.notifyDate;

      const now = new Date();

      const newNote: Note = {
        id: generateNoteId(),

        title:
          aiAnalysis?.title?.trim() ||
          generateFallbackTitle(cleanText),

        text: cleanText,

        createdAt: now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),

        createdAtIso: now.toISOString(),

        type:
          aiAnalysis?.type === 'reminder' || detected
            ? 'reminder'
            : 'note',

        category:
          aiAnalysis?.category ??
          detectCategory(cleanText),

        reminderAt: detected
          ? detected.reminderDate.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : undefined,

        notifyAt: finalNotifyDate
          ? finalNotifyDate.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : undefined,

        reminderAtIso:
          detected?.reminderDate.toISOString(),

        notifyAtIso:
          finalNotifyDate?.toISOString(),

        notificationId:
          scheduledNotification?.notificationId,

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
        current.filter((item) => item.id !== id)
      );

      /**
       * Une note supprimée ne doit plus déclencher
       * une notification plus tard.
       */
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

      /**
       * Quand un rappel est terminé,
       * sa notification encore en attente est annulée.
       */
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

      const newValue = !currentNote.isImportant;

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
          ? new Date(a.reminderAtIso).getTime()
          : 0;

        const dateB = b.reminderAtIso
          ? new Date(b.reminderAtIso).getTime()
          : 0;

        return dateA - dateB;
      });
  }, [notes]);

  const pendingNotes = useMemo(() => {
  return notes
    .filter((item) => !item.isDone)
    .sort(
      (a, b) =>
        new Date(b.createdAtIso).getTime() -
        new Date(a.createdAtIso).getTime()
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