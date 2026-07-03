import * as Notifications from 'expo-notifications';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { analyseNoteWithAI } from '../services/aiNoteService';
import { supabase } from '../services/supabase';
import { detectCategory } from '../utils/categoryUtils';
import { detectSmartReminder } from '../utils/smartReminderUtils';
import { useAuth } from './AuthContext';

export type Note = {
  id: string;
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
  addNote: () => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  toggleDone: (id: string) => void;
  toggleImportant: (id: string) => void;
  scheduledReminders: Note[];
  pendingNotes: Note[];
};

const DAILY_NOTIFICATIONS_KEY = 'rappelle_moi_daily_notifications_set';

const NotesContext = createContext<NotesContextValue | null>(null);

function detectReminderTime(text: string) {
  const match = text.match(/(\d{1,2})\s?h(?:\s?(\d{1,2}))?/i);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const reminderDate = new Date();
  reminderDate.setHours(hour, minute, 0, 0);

  if (reminderDate.getTime() < Date.now()) {
    reminderDate.setDate(reminderDate.getDate() + 1);
  }

  const notifyDate = new Date(reminderDate);
  notifyDate.setMinutes(notifyDate.getMinutes() - 10);

  return { reminderDate, notifyDate };
}

async function scheduleReminderNotification(text: string, reminderDate: Date) {
  if (Platform.OS === 'web') return null;

  const now = Date.now();

  if (reminderDate.getTime() <= now) {
    console.log('Rappel ignoré car date passée:', reminderDate);
    return null;
  }

  const tenMinutesBefore = new Date(reminderDate.getTime() - 10 * 60 * 1000);

  const notifyDate =
    tenMinutesBefore.getTime() > now
      ? tenMinutesBefore
      : reminderDate;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'RappelleMoi',
      body: text,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: notifyDate,
      channelId: 'default',
    },
  });

  console.log('Notification programmée:', {
    text,
    reminderDate: reminderDate.toISOString(),
    notifyDate: notifyDate.toISOString(),
    notificationId,
  });

  return notificationId;
}

async function scheduleDailySummaryNotification() {
  if (Platform.OS === 'web') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'RappelleMoi',
      body: 'Ton résumé du jour est prêt. Prends 2 minutes pour faire le point.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 45,
    },
  });
}

async function scheduleMorningReminderNotification() {
  if (Platform.OS === 'web') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'RappelleMoi',
      body: 'Regarde tes priorités du jour et les choses à ne pas oublier.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 45,
    },
  });
}

export function NotesProvider({ children }: { children: React.ReactNode }) {
  
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const { user } = useAuth();

  const saveNoteToSupabase = async (note: Note) => {
  if (!user) return;

  const { error } = await supabase.from('notes').upsert({
    id: note.id,
    user_id: user.id,

    text: note.text,

    created_at: note.createdAt,
    created_at_iso: note.createdAtIso,

    type: note.type,
    category: note.category,

    reminder_at: note.reminderAt ?? null,
    notify_at: note.notifyAt ?? null,

    reminder_at_iso: note.reminderAtIso ?? null,
    notify_at_iso: note.notifyAtIso ?? null,

    notification_id: note.notificationId ?? null,

    is_important: note.isImportant,
    is_done: note.isDone,
  });

  if (error) {
    console.log(error.message);
  }
};

  useEffect(() => {
  loadNotes();
}, [user]);

  useEffect(() => {
  if (Platform.OS === 'web') return;

  scheduleMorningReminderNotification();
  scheduleDailySummaryNotification();

}, []);


  const loadNotes = async () => {
  if (!user) {
    setNotes([]);
    return;
  }

  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at_iso', { ascending: false });

    if (error) {
      console.log(error.message);
      return;
    }

    const formattedNotes =
      data?.map((item: any) => ({
        id: item.id,
        text: item.text,
        createdAt: item.created_at,
        createdAtIso: item.created_at_iso,
        type: item.type,
        category: item.category,
        reminderAt: item.reminder_at,
        notifyAt: item.notify_at,
        reminderAtIso: item.reminder_at_iso,
        notifyAtIso: item.notify_at_iso,
        notificationId: item.notification_id,
        isImportant: item.is_important,
        isDone: item.is_done,
      })) ?? [];

    setNotes(formattedNotes);
  } catch (error) {
    console.log(error);
  }
};

  const addNote = async () => {
    if (!note.trim()) return;

    const cleanText = note.trim();
    const aiAnalysis = await analyseNoteWithAI(cleanText);
    const smartReminder = !aiAnalysis ? detectSmartReminder(cleanText) : null;

    let detected = null;

if (aiAnalysis?.type === 'reminder' && aiAnalysis.date && aiAnalysis.time) {
  const reminderDate = new Date(`${aiAnalysis.date}T${aiAnalysis.time}:00`);
  const notifyDate = new Date(reminderDate.getTime() - 10 * 60 * 1000);

  detected = {
    reminderDate,
    notifyDate,
  };
} else if (smartReminder) {
  detected = {
    reminderDate: smartReminder,
    notifyDate: new Date(smartReminder.getTime() - 10 * 60 * 1000),
  };
} else {
  detected = detectReminderTime(cleanText);
}

    const notificationId = detected
      ? await scheduleReminderNotification(cleanText, detected.reminderDate)
      : null;

    const now = new Date();

    const newNote: Note = {
      id: Date.now().toString(),
      text: cleanText,
      createdAt: now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAtIso: now.toISOString(),
      type: aiAnalysis?.type ?? (detected ? 'reminder' : 'note'),
      category: aiAnalysis?.category ?? detectCategory(cleanText),
      isImportant: false,
      isDone: false,
      reminderAt: detected
        ? detected.reminderDate.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : undefined,
      notifyAt: detected
        ? detected.notifyDate.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : undefined,
      reminderAtIso: detected ? detected.reminderDate.toISOString() : undefined,
      notifyAtIso: detected
  ? new Date(
      Math.max(
        Date.now(),
        detected.reminderDate.getTime() - 10 * 60 * 1000
      )
    ).toISOString()
  : undefined,
      notificationId: notificationId ?? undefined,
    };

    setNotes((currentNotes) => [newNote, ...currentNotes]);
    await saveNoteToSupabase(newNote);
    setNote('');
  };

  const deleteNote = async (id: string) => {
  setNotes((current) => current.filter((n) => n.id !== id));

  if (!user) return;

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.log(error.message);
  }
};

  const toggleDone = async (id: string) => {
  const currentNote = notes.find((item) => item.id === id);
  if (!currentNote || !user) return;

  const newValue = !currentNote.isDone;

  setNotes((currentNotes) =>
    currentNotes.map((item) =>
      item.id === id ? { ...item, isDone: newValue } : item
    )
  );

  const { error } = await supabase
    .from('notes')
    .update({ is_done: newValue })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) console.log(error.message);
};

  const toggleImportant = async (id: string) => {
  const currentNote = notes.find((item) => item.id === id);
  if (!currentNote || !user) return;

  const newValue = !currentNote.isImportant;

  setNotes((currentNotes) =>
    currentNotes.map((item) =>
      item.id === id ? { ...item, isImportant: newValue } : item
    )
  );

  const { error } = await supabase
    .from('notes')
    .update({ is_important: newValue })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) console.log(error.message);
};

  const scheduledReminders = useMemo(() => {
    const now = Date.now();

    return notes
      .filter((item) => {
        if (!item.reminderAtIso) return false;
        if (item.isDone) return false;
        return new Date(item.reminderAtIso).getTime() > now;
      })
      .sort((a, b) => {
        const dateA = a.reminderAtIso ? new Date(a.reminderAtIso).getTime() : 0;
        const dateB = b.reminderAtIso ? new Date(b.reminderAtIso).getTime() : 0;
        return dateA - dateB;
      });
  }, [notes]);

  const pendingNotes = useMemo(() => {
    return notes
      .filter((item) => !item.isDone)
      .sort(
        (a, b) =>
          new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime()
      )
      .slice(0, 5);
  }, [notes]);

  return (
    <NotesContext.Provider
      value={{
        note,
        setNote,
        notes,
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
    throw new Error('useNotes doit être utilisé dans NotesProvider');
  }

  return context;
}