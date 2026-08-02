const supabase = require('../config/supabase');
const {
  isValidExpoPushToken,
  sendExpoPushNotification,
} = require('./pushService');

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 100;
const PROCESSING_TIMEOUT_MINUTES = 10;

let processing = false;

function buildReminderBody(note) {
  const title =
    typeof note.title === 'string' && note.title.trim()
      ? note.title.trim()
      : null;

  const text =
    typeof note.text === 'string' && note.text.trim()
      ? note.text.trim()
      : 'Tu as un rappel à consulter dans Daya.';

  if (!title || title.toLowerCase() === text.toLowerCase()) {
    return text;
  }

  return `${title}\n${text}`;
}

async function loadDueReminders() {
  const nowIso = new Date().toISOString();
  const staleProcessingIso = new Date(
    Date.now() - PROCESSING_TIMEOUT_MINUTES * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from('notes')
    .select(`
      id,
      user_id,
      title,
      text,
      notify_at_iso,
      reminder_at_iso,
      push_status,
      push_attempts,
      push_processing_at
    `)
    .eq('type', 'reminder')
    .eq('is_done', false)
    .not('notify_at_iso', 'is', null)
    .lte('notify_at_iso', nowIso)
    .lt('push_attempts', MAX_ATTEMPTS)
    .or(
      `push_status.in.(pending,failed),and(push_status.eq.processing,push_processing_at.lt.${staleProcessingIso})`
    )
    .order('notify_at_iso', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function loadProfiles(userIds) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, expo_push_token, push_enabled')
    .in('id', uniqueUserIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}

async function claimReminder(noteId) {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('notes')
    .update({
      push_status: 'processing',
      push_processing_at: nowIso,
      push_last_error: null,
    })
    .eq('id', noteId)
    .in('push_status', ['pending', 'failed', 'processing'])
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

async function markReminderSent(noteId) {
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('notes')
    .update({
      push_status: 'sent',
      push_sent_at: nowIso,
      push_processing_at: null,
      push_last_error: null,
    })
    .eq('id', noteId);

  if (error) {
    throw new Error(error.message);
  }
}

async function markReminderFailed(note, errorMessage) {
  const nextAttempts = Number(note.push_attempts ?? 0) + 1;
  const finalStatus =
    nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'failed';

  const { error } = await supabase
    .from('notes')
    .update({
      push_status: finalStatus,
      push_attempts: nextAttempts,
      push_processing_at: null,
      push_last_error: String(errorMessage || 'Erreur inconnue').slice(0, 800),
    })
    .eq('id', note.id);

  if (error) {
    console.error(
      `Impossible d'enregistrer l'échec du rappel ${note.id} :`,
      error.message
    );
  }
}

async function processDueReminders() {
  if (processing) {
    return {
      skipped: true,
      reason: 'Une exécution est déjà en cours.',
      remindersFound: 0,
      sent: 0,
      failed: 0,
      skippedReminders: 0,
      results: [],
    };
  }

  processing = true;

  try {
    const reminders = await loadDueReminders();

    if (reminders.length === 0) {
      return {
        skipped: false,
        remindersFound: 0,
        sent: 0,
        failed: 0,
        skippedReminders: 0,
        results: [],
      };
    }

    const profilesByUserId = await loadProfiles(
      reminders.map((note) => note.user_id)
    );

    const results = [];

    for (const note of reminders) {
      const profile = profilesByUserId.get(note.user_id);

      if (!profile?.push_enabled) {
        results.push({
          noteId: note.id,
          status: 'skipped',
          reason: 'Push désactivé pour cet utilisateur.',
        });
        continue;
      }

      if (!isValidExpoPushToken(profile.expo_push_token)) {
        await markReminderFailed(
          note,
          'Token Expo Push invalide ou manquant.'
        );

        results.push({
          noteId: note.id,
          status: 'failed',
          reason: 'Token Expo Push invalide ou manquant.',
        });
        continue;
      }

      const claimed = await claimReminder(note.id);

      if (!claimed) {
        results.push({
          noteId: note.id,
          status: 'skipped',
          reason: 'Rappel déjà pris en charge.',
        });
        continue;
      }

      try {
        const ticket = await sendExpoPushNotification({
          token: profile.expo_push_token,
          title: 'Daya',
          body: buildReminderBody(note),
          channelId: 'daya-reminders-v1',
          data: {
            kind: 'personal_reminder',
            noteId: note.id,
            reminderAtIso: note.reminder_at_iso,
            notifyAtIso: note.notify_at_iso,
            sentAt: new Date().toISOString(),
          },
        });

        await markReminderSent(note.id);

        results.push({
          noteId: note.id,
          status: 'sent',
          ticketId: ticket?.id ?? null,
        });
      } catch (error) {
        await markReminderFailed(note, error.message);

        results.push({
          noteId: note.id,
          status: 'failed',
          reason: error.message,
        });
      }
    }

    return {
      skipped: false,
      remindersFound: reminders.length,
      sent: results.filter((item) => item.status === 'sent').length,
      failed: results.filter((item) => item.status === 'failed').length,
      skippedReminders: results.filter((item) => item.status === 'skipped')
        .length,
      results,
    };
  } finally {
    processing = false;
  }
}

module.exports = {
  processDueReminders,
};
