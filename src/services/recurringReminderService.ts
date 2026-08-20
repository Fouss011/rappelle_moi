import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

export type RecurringReminder = {
  id: string;
  userId: string;
  title: string;
  text: string;
  hour: number;
  minute: number;
  timezone: string;
  frequency: 'daily';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecurringReminderSuggestion = {
  title: string;
  text: string;
  hour: number;
  minute: number;
  occurrenceCount: number;
  matchedNoteIds: string[];
};

type ReminderLike = {
  id: string;
  title: string;
  text: string;
  type: 'note' | 'reminder';
  reminderAtIso?: string;
  createdAtIso: string;
};

const LOCAL_NOTIFICATION_KEY_PREFIX =
  '@daya:recurring-reminder-notification:';

const STOP_WORDS = new Set([
  'a',
  'à',
  'au',
  'aux',
  'de',
  'des',
  'du',
  'le',
  'la',
  'les',
  'un',
  'une',
  'et',
  'je',
  'me',
  'moi',
  'mon',
  'ma',
  'mes',
  'rappelle',
  'rappeler',
  'rappel',
  'penser',
  'pense',
  'oublier',
  'oublie',
  'pas',
  'demain',
  'aujourd',
  'hui',
]);

function mapRecurringReminder(row: any): RecurringReminder {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    text: row.text,
    hour: Number(row.hour),
    minute: Number(row.minute),
    timezone: row.timezone || 'Europe/Paris',
    frequency: 'daily',
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getNotificationStorageKey(id: string) {
  return `${LOCAL_NOTIFICATION_KEY_PREFIX}${id}`;
}

function normalizeTopic(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(
      /\b(aujourd['’]?hui|demain|apres-demain|ce soir|ce matin|cet apres-midi)\b/gi,
      ' '
    )
    .replace(
      /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(\s+prochain)?\b/gi,
      ' '
    )
    .replace(/\b(à|a|vers)\s+\d{1,2}\s*h(?:\s*\d{1,2})?\b/gi, ' ')
    .replace(/\b\d{1,2}:\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, ' ')
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function topicTokens(text: string) {
  return normalizeTopic(text)
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(
      (item) =>
        item.length >= 3 &&
        !STOP_WORDS.has(item)
    );
}

function topicSimilarity(a: string, b: string) {
  const normalizedA = normalizeTopic(a);
  const normalizedB = normalizeTopic(b);

  if (!normalizedA || !normalizedB) {
    return 0;
  }

  if (
    normalizedA === normalizedB ||
    normalizedA.includes(normalizedB) ||
    normalizedB.includes(normalizedA)
  ) {
    return 1;
  }

  const tokensA = new Set(topicTokens(a));
  const tokensB = new Set(topicTokens(b));

  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  let intersection = 0;

  tokensA.forEach((token) => {
    if (tokensB.has(token)) {
      intersection += 1;
    }
  });

  const union = new Set([
    ...tokensA,
    ...tokensB,
  ]).size;

  return union === 0 ? 0 : intersection / union;
}

function getMinuteOfDay(dateIso?: string) {
  if (!dateIso) return null;

  const date = new Date(dateIso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getHours() * 60 + date.getMinutes();
}

function circularMinuteDifference(a: number, b: number) {
  const direct = Math.abs(a - b);
  return Math.min(direct, 1440 - direct);
}

function buildDateKey(dateIso: string) {
  const date = new Date(dateIso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function detectRecurringReminderSuggestion({
  notes,
  sourceReminder,
  recurringReminders,
}: {
  notes: ReminderLike[];
  sourceReminder: ReminderLike;
  recurringReminders: RecurringReminder[];
}): RecurringReminderSuggestion | null {
  if (
    sourceReminder.type !== 'reminder' ||
    !sourceReminder.reminderAtIso
  ) {
    return null;
  }

  const sourceMinute = getMinuteOfDay(
    sourceReminder.reminderAtIso
  );

  if (sourceMinute === null) {
    return null;
  }

  const matchingRecurring = recurringReminders.some(
    (item) => {
      const itemMinute = item.hour * 60 + item.minute;

      return (
        topicSimilarity(item.text, sourceReminder.text) >= 0.6 &&
        circularMinuteDifference(
          itemMinute,
          sourceMinute
        ) <= 30
      );
    }
  );

  if (matchingRecurring) {
    return null;
  }

  const ninetyDaysAgo =
    Date.now() - 90 * 24 * 60 * 60 * 1000;

  const matches = notes.filter((item) => {
    if (
      item.type !== 'reminder' ||
      !item.reminderAtIso
    ) {
      return false;
    }

    const createdAt = new Date(
      item.createdAtIso
    ).getTime();

    if (
      Number.isNaN(createdAt) ||
      createdAt < ninetyDaysAgo
    ) {
      return false;
    }

    const itemMinute = getMinuteOfDay(
      item.reminderAtIso
    );

    if (itemMinute === null) {
      return false;
    }

    return (
      circularMinuteDifference(
        itemMinute,
        sourceMinute
      ) <= 30 &&
      topicSimilarity(
        item.text,
        sourceReminder.text
      ) >= 0.6
    );
  });

  const distinctDays = new Set(
    matches
      .map((item) => buildDateKey(item.createdAtIso))
      .filter(Boolean)
  ).size;

  if (matches.length < 5 || distinctDays < 3) {
    return null;
  }

  const averageMinute = Math.round(
    matches.reduce((sum, item) => {
      return (
        sum +
        (getMinuteOfDay(item.reminderAtIso) ??
          sourceMinute)
      );
    }, 0) / matches.length
  );

  return {
    title: sourceReminder.title,
    text: sourceReminder.text,
    hour: Math.floor(averageMinute / 60) % 24,
    minute: averageMinute % 60,
    occurrenceCount: matches.length,
    matchedNoteIds: matches.map((item) => item.id),
  };
}

export async function loadRecurringReminders(
  userId: string
) {
  const { data, error } = await supabase
    .from('recurring_reminders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRecurringReminder);
}

export async function createRecurringReminder({
  userId,
  suggestion,
}: {
  userId: string;
  suggestion: RecurringReminderSuggestion;
}) {
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'Europe/Paris';

  const { data, error } = await supabase
    .from('recurring_reminders')
    .insert({
      user_id: userId,
      title: suggestion.title,
      text: suggestion.text,
      hour: suggestion.hour,
      minute: suggestion.minute,
      timezone,
      frequency: 'daily',
      enabled: true,
      source_note_ids: suggestion.matchedNoteIds,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRecurringReminder(data);
}

export async function setRecurringReminderEnabled({
  userId,
  id,
  enabled,
}: {
  userId: string;
  id: string;
  enabled: boolean;
}) {
  const { data, error } = await supabase
    .from('recurring_reminders')
    .update({
      enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRecurringReminder(data);
}

export async function deleteRecurringReminder({
  userId,
  id,
}: {
  userId: string;
  id: string;
}) {
  const { error } = await supabase
    .from('recurring_reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function cancelLocalRecurringReminder(
  recurringReminderId: string
) {
  if (Platform.OS === 'web') {
    return;
  }

  const key = getNotificationStorageKey(
    recurringReminderId
  );
  const notificationId = await AsyncStorage.getItem(
    key
  );

  if (notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(
        notificationId
      );
    } catch (error) {
      console.warn(
        'Impossible d’annuler le rappel récurrent local :',
        error
      );
    }
  }

  await AsyncStorage.removeItem(key);
}

export async function scheduleLocalRecurringReminder(
  item: RecurringReminder
) {
  if (Platform.OS === 'web' || !item.enabled) {
    return;
  }

  const permissions =
    await Notifications.getPermissionsAsync();

  let granted =
    permissions.granted ||
    permissions.status === 'granted';

  if (!granted) {
    const requested =
      await Notifications.requestPermissionsAsync();

    granted =
      requested.granted ||
      requested.status === 'granted';
  }

  if (!granted) {
    return;
  }

  await cancelLocalRecurringReminder(item.id);

  const reminderMinute =
    item.hour * 60 + item.minute;
  const notifyMinute =
    (reminderMinute - 10 + 1440) % 1440;

  const notificationId =
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Daya',
        body: `Rappel quotidien : ${item.text}`,
        sound: 'default',
        data: {
          kind: 'recurring_reminder_local_v1',
          recurringReminderId: item.id,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Math.floor(notifyMinute / 60),
        minute: notifyMinute % 60,
        channelId: 'daya-reminders-v1',
      },
    });

  await AsyncStorage.setItem(
    getNotificationStorageKey(item.id),
    notificationId
  );
}

export async function syncLocalRecurringReminders(
  items: RecurringReminder[]
) {
  if (Platform.OS === 'web') {
    return;
  }

  await Promise.all(
    items.map(async (item) => {
      if (item.enabled) {
        await scheduleLocalRecurringReminder(item);
      } else {
        await cancelLocalRecurringReminder(item.id);
      }
    })
  );
}
