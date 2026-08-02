const supabase = require('../config/supabase');

function getDateKey(date, timezone = 'Europe/Paris') {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function belongsToLocalDay(isoDate, expectedDateKey, timezone) {
  if (!isoDate) {
    return false;
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return getDateKey(date, timezone) === expectedDateKey;
}

function formatReminder(reminder, timezone) {
  const date = new Date(reminder.reminder_at_iso);
  const label = reminder.title || reminder.text || 'Rappel';

  const dateText = new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  return `${label} — ${dateText}`;
}

function generateSummary({ todayNotes, upcomingReminders, timezone }) {
  const doneToday = todayNotes.filter((item) => item.is_done).length;
  const createdToday = todayNotes.length;

  if (upcomingReminders.length === 0) {
    return `Bonsoir 👋 ${createdToday} élément(s) créé(s) aujourd’hui, dont ${doneToday} terminé(s). Aucun rappel à venir.`;
  }

  const displayed = upcomingReminders.slice(0, 3);
  const details = displayed
    .map((item) => formatReminder(item, timezone))
    .join(' • ');

  const remaining = upcomingReminders.length - displayed.length;
  const suffix = remaining > 0 ? ` • Et ${remaining} autre(s).` : '';

  return `Bonsoir 👋 ${createdToday} élément(s) créé(s) aujourd’hui, dont ${doneToday} terminé(s). ${upcomingReminders.length} rappel(s) à venir : ${details}${suffix}`.slice(0, 500);
}

async function generateAndSaveDailySummary(
  userId,
  timezone = 'Europe/Paris'
) {
  if (!userId) {
    throw new Error('userId manquant pour le résumé quotidien.');
  }

  const todayKey = getDateKey(new Date(), timezone);

  const { data: recentNotes, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at_iso', { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const notes = recentNotes ?? [];
  const now = Date.now();

  const todayNotes = notes.filter((item) =>
    belongsToLocalDay(item.created_at_iso, todayKey, timezone)
  );

  const upcomingReminders = notes
    .filter((item) => {
      if (
        item.is_done ||
        item.type !== 'reminder' ||
        !item.reminder_at_iso
      ) {
        return false;
      }

      const reminderTime = new Date(item.reminder_at_iso).getTime();

      return !Number.isNaN(reminderTime) && reminderTime > now;
    })
    .sort(
      (a, b) =>
        new Date(a.reminder_at_iso).getTime() -
        new Date(b.reminder_at_iso).getTime()
    );

  const summary = generateSummary({
    todayNotes,
    upcomingReminders,
    timezone,
  });

  const summaryId = `${userId}-${todayKey}`;

  const { error: summaryError } = await supabase
    .from('daily_summaries')
    .upsert(
      {
        id: summaryId,
        user_id: userId,
        summary_date: todayKey,
        summary_text: summary,
        total_notes: todayNotes.length,
        important_count: todayNotes.filter((item) => item.is_important)
          .length,
        reminder_count: upcomingReminders.length,
        done_count: todayNotes.filter((item) => item.is_done).length,
      },
      {
        onConflict: 'id',
      }
    );

  if (summaryError) {
    throw new Error(summaryError.message);
  }

  return summary;
}

module.exports = {
  generateSummary,
  generateAndSaveDailySummary,
};
