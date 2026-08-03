const supabase = require('../config/supabase');

function getDateKey(
  date,
  timezone = 'Europe/Paris'
) {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function belongsToLocalDay(
  isoDate,
  expectedDateKey,
  timezone
) {
  if (!isoDate) {
    return false;
  }

  const date = new Date(isoDate);

  return (
    !Number.isNaN(date.getTime()) &&
    getDateKey(date, timezone) ===
      expectedDateKey
  );
}

function pluralize(
  count,
  singular,
  plural = `${singular}s`
) {
  return count === 1 ? singular : plural;
}

function cleanReminderLabel(reminder) {
  const title =
    typeof reminder?.title === 'string'
      ? reminder.title.trim()
      : '';

  const text =
    typeof reminder?.text === 'string'
      ? reminder.text.trim()
      : '';

  if (
    title &&
    text &&
    title.toLowerCase() !== text.toLowerCase()
  ) {
    return `${title} — ${text}`;
  }

  return (
    title ||
    text ||
    'Rappel à consulter dans Daya'
  );
}

function formatReminderDate(
  isoDate,
  timezone
) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(date)
    .replace(',', ' à');
}

function getEveningEnding(dateKey) {
  const endings = [
    'Bonne soirée 🌙',
    'Reposez-vous bien 😴',
    'Prenez soin de vous 💙',
    'À demain 👋',
  ];

  const dayNumber = Number(
    dateKey.replaceAll('-', '')
  );

  return endings[
    dayNumber % endings.length
  ];
}

function buildReliableEveningSummary({
  todayNoteCount,
  todayReminderCount,
  upcomingReminders,
  timezone,
  dateKey,
}) {
  const lines = [
    'Bonsoir 👋 Aujourd’hui :',
    `📝 ${todayNoteCount} ${pluralize(
      todayNoteCount,
      'note créée',
      'notes créées'
    )}`,
    `⏰ ${todayReminderCount} ${pluralize(
      todayReminderCount,
      'rappel créé',
      'rappels créés'
    )}`,
  ];

  if (upcomingReminders.length === 0) {
    lines.push('📅 Aucun rappel à venir.');
  } else {
    const nextReminder =
      upcomingReminders[0];

    const nextLabel =
      cleanReminderLabel(nextReminder);

    const nextDate =
      formatReminderDate(
        nextReminder.reminder_at_iso,
        timezone
      );

    lines.push(
      `📅 ${upcomingReminders.length} ${pluralize(
        upcomingReminders.length,
        'rappel reste',
        'rappels restent'
      )} à venir.`
    );

    lines.push(
      nextDate
        ? `Prochain : ${nextLabel} — ${nextDate}.`
        : `Prochain : ${nextLabel}.`
    );
  }

  lines.push(getEveningEnding(dateKey));

  return lines.join('\n');
}

async function generateAndSaveDailySummary(
  userId,
  timezone = 'Europe/Paris',
  options = {}
) {
  if (!userId) {
    throw new Error(
      'userId manquant pour le résumé quotidien.'
    );
  }

  const forceDaily =
    options.forceDaily === true;

  const todayKey =
    getDateKey(new Date(), timezone);

  const { data: recentNotes, error } =
    await supabase
      .from('notes')
      .select(`
        id,
        user_id,
        title,
        text,
        type,
        created_at_iso,
        reminder_at_iso,
        is_done,
        is_important
      `)
      .eq('user_id', userId)
      .order('created_at_iso', {
        ascending: false,
      })
      .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  const notes = recentNotes ?? [];

  const todayItems = notes.filter((item) =>
    belongsToLocalDay(
      item.created_at_iso,
      todayKey,
      timezone
    )
  );

  const todayRegularNotes =
    todayItems.filter(
      (item) => item.type !== 'reminder'
    );

  const todayReminders =
    todayItems.filter(
      (item) => item.type === 'reminder'
    );

  /*
   * Règle produit :
   * par défaut, aucun bilan si l'utilisateur
   * n'a créé ni note ni rappel aujourd'hui.
   *
   * Un ancien rappel prévu dans quelques jours
   * ne déclenche donc pas un bilan chaque soir.
   */
  const hasActivityToday =
    todayRegularNotes.length > 0 ||
    todayReminders.length > 0;

  if (!hasActivityToday && !forceDaily) {
    return null;
  }

  const now = Date.now();

  const upcomingReminders = notes
    .filter((item) => {
      if (
        item.type !== 'reminder' ||
        item.is_done ||
        !item.reminder_at_iso
      ) {
        return false;
      }

      const reminderTime =
        new Date(
          item.reminder_at_iso
        ).getTime();

      return (
        !Number.isNaN(reminderTime) &&
        reminderTime > now
      );
    })
    .sort((a, b) => {
      return (
        new Date(
          a.reminder_at_iso
        ).getTime() -
        new Date(
          b.reminder_at_iso
        ).getTime()
      );
    });

  const summary =
    buildReliableEveningSummary({
      todayNoteCount:
        todayRegularNotes.length,
      todayReminderCount:
        todayReminders.length,
      upcomingReminders,
      timezone,
      dateKey: todayKey,
    });

  const summaryId =
    `${userId}-${todayKey}`;

  const { error: summaryError } =
    await supabase
      .from('daily_summaries')
      .upsert(
        {
          id: summaryId,
          user_id: userId,
          summary_date: todayKey,
          summary_text: summary,
          total_notes:
            todayRegularNotes.length,
          important_count:
            todayItems.filter(
              (item) => item.is_important
            ).length,
          reminder_count:
            todayReminders.length,
          done_count:
            todayItems.filter(
              (item) => item.is_done
            ).length,
        },
        {
          onConflict: 'id',
        }
      );

  if (summaryError) {
    throw new Error(
      summaryError.message
    );
  }

  return summary;
}

module.exports = {
  buildReliableEveningSummary,
  generateAndSaveDailySummary,
};
