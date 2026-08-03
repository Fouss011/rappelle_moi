const supabase = require('../config/supabase');

const {
  isValidExpoPushToken,
  sendExpoPushNotification,
  getExpoPushReceipts,
} = require('./pushService');

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 100;
const PROCESSING_TIMEOUT_MINUTES = 10;
const RECEIPT_WAIT_MINUTES = 15;

let sendingInProgress = false;
let receiptCheckInProgress = false;

function buildReminderBody(note) {
  const title =
    typeof note.title === 'string' && note.title.trim()
      ? note.title.trim()
      : null;

  const text =
    typeof note.text === 'string' && note.text.trim()
      ? note.text.trim()
      : 'Tu as un rappel à consulter dans Daya.';

  const mainText =
    !title || title.toLowerCase() === text.toLowerCase()
      ? text
      : `${title} — ${text}`;

  const reminderTime =
    new Date(note.reminder_at_iso).getTime();

  const minutesRemaining = Number.isNaN(reminderTime)
    ? null
    : Math.round(
        (reminderTime - Date.now()) / 60000
      );

  if (
    minutesRemaining !== null &&
    minutesRemaining >= 3 &&
    minutesRemaining <= 7
  ) {
    return `N’oublie pas : ${mainText}. C’est dans 5 minutes.`;
  }

  if (
    minutesRemaining !== null &&
    minutesRemaining <= 2
  ) {
    return `N’oublie pas : ${mainText}. C’est maintenant.`;
  }

  return `À ne pas oublier : ${mainText}`;
}

async function recoverStaleClaims() {
  const staleProcessingIso = new Date(
    Date.now() -
      PROCESSING_TIMEOUT_MINUTES * 60 * 1000
  ).toISOString();

  const { error } = await supabase
    .from('notes')
    .update({
      push_status: 'failed',
      push_processing_at: null,
      push_last_error:
        'Traitement interrompu avant la création du ticket Expo.',
    })
    .eq('type', 'reminder')
    .eq('is_done', false)
    .eq('push_status', 'processing')
    .is('push_ticket_id', null)
    .lt('push_processing_at', staleProcessingIso);

  if (error) {
    throw new Error(error.message);
  }
}

async function loadDueReminders() {
  const nowIso = new Date().toISOString();

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
      push_attempts
    `)
    .eq('type', 'reminder')
    .eq('is_done', false)
    .not('notify_at_iso', 'is', null)
    .lte('notify_at_iso', nowIso)
    .lt('push_attempts', MAX_ATTEMPTS)
    .in('push_status', ['pending', 'failed'])
    .order('notify_at_iso', {
      ascending: true,
    })
    .limit(BATCH_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function loadProfiles(userIds) {
  const uniqueUserIds = [
    ...new Set(userIds.filter(Boolean)),
  ];

  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, expo_push_token, push_enabled'
    )
    .in('id', uniqueUserIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((profile) => [
      profile.id,
      profile,
    ])
  );
}

async function claimReminder(noteId) {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('notes')
    .update({
      push_status: 'processing',
      push_processing_at: nowIso,
      push_last_error: null,
      push_ticket_id: null,
      push_ticket_created_at: null,
      push_receipt_status: null,
      push_receipt_checked_at: null,
    })
    .eq('id', noteId)
    .in('push_status', ['pending', 'failed'])
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

async function markTicketAccepted(
  noteId,
  ticketId
) {
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('notes')
    .update({
      push_status: 'processing',
      push_ticket_id: ticketId,
      push_ticket_created_at: nowIso,
      push_receipt_status: 'waiting',
      push_receipt_checked_at: null,
      push_processing_at: nowIso,
      push_last_error: null,
    })
    .eq('id', noteId)
    .eq('push_status', 'processing');

  if (error) {
    throw new Error(error.message);
  }
}

async function markReminderSent(
  noteId,
  receiptStatus = 'ok'
) {
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('notes')
    .update({
      push_status: 'sent',
      push_sent_at: nowIso,
      push_processing_at: null,
      push_receipt_status: receiptStatus,
      push_receipt_checked_at: nowIso,
      push_last_error: null,
    })
    .eq('id', noteId);

  if (error) {
    throw new Error(error.message);
  }
}

async function markReceiptStillWaiting(noteId) {
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('notes')
    .update({
      push_receipt_status: 'waiting',
      push_receipt_checked_at: nowIso,
    })
    .eq('id', noteId)
    .eq('push_status', 'processing');

  if (error) {
    throw new Error(error.message);
  }
}

async function markReminderFailed(
  note,
  errorMessage,
  receiptStatus = 'error'
) {
  const nextAttempts =
    Number(note.push_attempts ?? 0) + 1;

  const { error } = await supabase
    .from('notes')
    .update({
      push_status: 'failed',
      push_attempts: nextAttempts,
      push_processing_at: null,
      push_receipt_status: receiptStatus,
      push_receipt_checked_at:
        new Date().toISOString(),
      push_last_error: String(
        errorMessage || 'Erreur inconnue'
      ).slice(0, 800),
    })
    .eq('id', note.id);

  if (error) {
    console.error(
      `Impossible d'enregistrer l'échec du rappel ${note.id} :`,
      error.message
    );
  }
}

async function markReminderIgnored(
  noteId,
  reason
) {
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('notes')
    .update({
      push_status: 'failed',
      push_attempts: MAX_ATTEMPTS,
      push_processing_at: null,
      push_receipt_status: 'push_disabled',
      push_receipt_checked_at: nowIso,
      push_last_error: String(
        reason || 'Rappel ignoré.'
      ).slice(0, 800),
    })
    .eq('id', noteId);

  if (error) {
    console.error(
      `Impossible de neutraliser le rappel ${noteId} :`,
      error.message
    );
  }
}

async function disableInvalidPushToken(
  userId,
  token
) {
  const { error } = await supabase
    .from('profiles')
    .update({
      push_enabled: false,
      expo_push_token: null,
    })
    .eq('id', userId)
    .eq('expo_push_token', token);

  if (error) {
    console.error(
      `Impossible de désactiver le token de l'utilisateur ${userId} :`,
      error.message
    );
  }
}

async function processDueReminders() {
  if (sendingInProgress) {
    return {
      skipped: true,
      reason:
        'Une exécution d’envoi est déjà en cours.',
      remindersFound: 0,
      ticketed: 0,
      failed: 0,
      skippedReminders: 0,
      results: [],
    };
  }

  sendingInProgress = true;

  try {
    await recoverStaleClaims();

    const reminders = await loadDueReminders();

    if (reminders.length === 0) {
      return {
        skipped: false,
        remindersFound: 0,
        ticketed: 0,
        failed: 0,
        skippedReminders: 0,
        results: [],
      };
    }

    const profilesByUserId =
      await loadProfiles(
        reminders.map((note) => note.user_id)
      );

    const results = [];

    for (const note of reminders) {
      const profile = profilesByUserId.get(
        note.user_id
      );

      if (!profile?.push_enabled) {
        await markReminderIgnored(
          note.id,
          'Push désactivé pour cet utilisateur.'
        );

        results.push({
          noteId: note.id,
          status: 'skipped',
          reason:
            'Push désactivé pour cet utilisateur.',
        });
        continue;
      }

      if (
        !isValidExpoPushToken(
          profile.expo_push_token
        )
      ) {
        await markReminderFailed(
          note,
          'Token Expo Push invalide ou manquant.',
          'invalid_token'
        );

        results.push({
          noteId: note.id,
          status: 'failed',
          reason:
            'Token Expo Push invalide ou manquant.',
        });
        continue;
      }

      const claimed = await claimReminder(
        note.id
      );

      if (!claimed) {
        results.push({
          noteId: note.id,
          status: 'skipped',
          reason:
            'Rappel déjà pris en charge.',
        });
        continue;
      }

      try {
        const ticket =
          await sendExpoPushNotification({
            token:
              profile.expo_push_token,
            title: 'Daya',
            body: buildReminderBody(note),
            channelId:
              'daya-reminders-v1',
            data: {
              kind: 'personal_reminder',
              noteId: note.id,
              reminderAtIso:
                note.reminder_at_iso,
              notifyAtIso:
                note.notify_at_iso,
              sentAt:
                new Date().toISOString(),
            },
          });

        await markTicketAccepted(
          note.id,
          ticket.id
        );

        results.push({
          noteId: note.id,
          status: 'ticketed',
          ticketId: ticket.id,
        });
      } catch (error) {
        await markReminderFailed(
          note,
          error.message,
          error.expoError || 'send_error'
        );

        if (
          error.expoError ===
          'DeviceNotRegistered'
        ) {
          await disableInvalidPushToken(
            note.user_id,
            profile.expo_push_token
          );
        }

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
      ticketed: results.filter(
        (item) =>
          item.status === 'ticketed'
      ).length,
      failed: results.filter(
        (item) => item.status === 'failed'
      ).length,
      skippedReminders: results.filter(
        (item) =>
          item.status === 'skipped'
      ).length,
      results,
    };
  } finally {
    sendingInProgress = false;
  }
}

async function loadPendingReceipts() {
  const receiptReadyIso = new Date(
    Date.now() -
      RECEIPT_WAIT_MINUTES * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from('notes')
    .select(`
      id,
      user_id,
      push_attempts,
      push_ticket_id,
      push_ticket_created_at
    `)
    .eq('type', 'reminder')
    .eq('push_status', 'processing')
    .not('push_ticket_id', 'is', null)
    .lte(
      'push_ticket_created_at',
      receiptReadyIso
    )
    .order('push_ticket_created_at', {
      ascending: true,
    })
    .limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function processPendingReceipts() {
  if (receiptCheckInProgress) {
    return {
      skipped: true,
      reason:
        'Une vérification des reçus est déjà en cours.',
      receiptsFound: 0,
      confirmed: 0,
      failed: 0,
      waiting: 0,
      results: [],
    };
  }

  receiptCheckInProgress = true;

  try {
    const notes =
      await loadPendingReceipts();

    if (notes.length === 0) {
      return {
        skipped: false,
        receiptsFound: 0,
        confirmed: 0,
        failed: 0,
        waiting: 0,
        results: [],
      };
    }

    const receipts =
      await getExpoPushReceipts(
        notes.map(
          (note) => note.push_ticket_id
        )
      );

    const profilesByUserId =
      await loadProfiles(
        notes.map((note) => note.user_id)
      );

    const results = [];

    for (const note of notes) {
      const receipt =
        receipts[note.push_ticket_id];

      if (!receipt) {
        await markReceiptStillWaiting(
          note.id
        );

        results.push({
          noteId: note.id,
          ticketId: note.push_ticket_id,
          status: 'waiting',
          reason:
            'Reçu Expo pas encore disponible.',
        });
        continue;
      }

      if (receipt.status === 'ok') {
        await markReminderSent(
          note.id,
          'ok'
        );

        results.push({
          noteId: note.id,
          ticketId: note.push_ticket_id,
          status: 'confirmed',
        });
        continue;
      }

      const expoError =
        receipt.details?.error ||
        'receipt_error';

      const errorMessage =
        receipt.message ||
        expoError ||
        'Expo a signalé une erreur de livraison.';

      await markReminderFailed(
        note,
        errorMessage,
        expoError
      );

      if (
        expoError ===
        'DeviceNotRegistered'
      ) {
        const profile =
          profilesByUserId.get(
            note.user_id
          );

        if (profile?.expo_push_token) {
          await disableInvalidPushToken(
            note.user_id,
            profile.expo_push_token
          );
        }
      }

      results.push({
        noteId: note.id,
        ticketId: note.push_ticket_id,
        status: 'failed',
        reason: errorMessage,
        expoError,
      });
    }

    return {
      skipped: false,
      receiptsFound: notes.length,
      confirmed: results.filter(
        (item) =>
          item.status === 'confirmed'
      ).length,
      failed: results.filter(
        (item) => item.status === 'failed'
      ).length,
      waiting: results.filter(
        (item) => item.status === 'waiting'
      ).length,
      results,
    };
  } finally {
    receiptCheckInProgress = false;
  }
}

module.exports = {
  processDueReminders,
  processPendingReceipts,
};
