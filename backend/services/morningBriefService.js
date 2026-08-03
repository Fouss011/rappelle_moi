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

function cleanReminderLabel(reminder) {
  const title =
    typeof reminder?.title === 'string'
      ? reminder.title.trim()
      : '';

  const text =
    typeof reminder?.text === 'string'
      ? reminder.text.trim()
      : '';

  return title || text || 'Rappel Daya';
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

function getNoReminderMessage(dateKey) {
  const messages = [
    [
      '☀️ Bonjour !',
      "Aucun rappel aujourd'hui.",
      '💡 Ne gardez plus tout en tête.',
      'Confiez-le à Daya.',
      'Belle journée !',
    ],
    [
      '☀️ Bonjour !',
      "Aucun rappel aujourd'hui.",
      '💡 Une idée vous vient ?',
      'Daya s’en souviendra.',
      'Bonne journée !',
    ],
    [
      '☀️ Bonjour !',
      'Rien à signaler ce matin.',
      '📝 Daya est là pour garder',
      'ce qui compte pour vous.',
      'Belle journée !',
    ],
  ];

  const dayNumber = Number(
    dateKey.replaceAll('-', '')
  );

  return messages[
    dayNumber % messages.length
  ].join('\n');
}

async function generateMorningBrief(
  userId,
  timezone = 'Europe/Paris'
) {
  if (!userId) {
    throw new Error(
      'userId manquant pour le briefing du matin.'
    );
  }

  const { data: notes, error } =
    await supabase
      .from('notes')
      .select(`
        id,
        title,
        text,
        type,
        reminder_at_iso,
        is_done
      `)
      .eq('user_id', userId)
      .eq('type', 'reminder')
      .eq('is_done', false)
      .not('reminder_at_iso', 'is', null)
      .order('reminder_at_iso', {
        ascending: true,
      })
      .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  const now = Date.now();

  const upcomingReminders =
    (notes ?? []).filter((item) => {
      const reminderTime =
        new Date(
          item.reminder_at_iso
        ).getTime();

      return (
        !Number.isNaN(reminderTime) &&
        reminderTime > now
      );
    });

  const dateKey =
    getDateKey(new Date(), timezone);

  if (upcomingReminders.length === 0) {
    return getNoReminderMessage(dateKey);
  }

  const nextReminder =
    upcomingReminders[0];

  const nextLabel =
    cleanReminderLabel(nextReminder);

  const nextDate =
    formatReminderDate(
      nextReminder.reminder_at_iso,
      timezone
    );

  const countLine =
    upcomingReminders.length === 1
      ? '📅 1 rappel à venir.'
      : `📅 ${upcomingReminders.length} rappels à venir.`;

  return [
    '☀️ Bonjour !',
    countLine,
    nextDate
      ? `Prochain : ${nextLabel} — ${nextDate}.`
      : `Prochain : ${nextLabel}.`,
    'Belle journée !',
  ].join('\n');
}

module.exports = {
  generateMorningBrief,
};
