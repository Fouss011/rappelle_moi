const openai = require('../config/openai');
const supabase = require('../config/supabase');

function getDateKey(date, timezone = 'Europe/Paris') {
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

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return getDateKey(date, timezone) === expectedDateKey;
}

async function generateSummary(notes) {
  if (!notes || notes.length === 0) {
    return "Aucune nouvelle capture enregistrée aujourd'hui.";
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          "Tu es Daya, l'assistant mémoire personnel de l'utilisateur. Tu résumes uniquement les données fournies, sans rien inventer.",
      },
      {
        role: 'user',
        content: `
Voici les captures du jour :

${JSON.stringify(notes, null, 2)}

Rédige un bilan très court en français :
- maximum 350 caractères ;
- commence par "Bonsoir 👋" ;
- indique les éléments importants ;
- indique les rappels encore à venir ;
- ne cite aucun rappel passé ;
- aucune mise en forme Markdown.
`,
      },
    ],
  });

  return (
    response.choices[0]?.message?.content?.trim() ||
    'Bonsoir 👋 Ton bilan est disponible dans Daya.'
  );
}

async function generateAndSaveDailySummary(
  userId,
  timezone = 'Europe/Paris'
) {
  if (!userId) {
    throw new Error('userId manquant pour le résumé quotidien.');
  }

  const todayKey = getDateKey(new Date(), timezone);

  /*
   * On récupère les notes récentes, puis on filtre selon
   * la date locale de l’utilisateur. Cela évite les erreurs
   * UTC autour de minuit.
   */
  const { data: recentNotes, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at_iso', { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const todayNotes = (recentNotes ?? []).filter((item) =>
    belongsToLocalDay(
      item.created_at_iso,
      todayKey,
      timezone
    )
  );

  const now = Date.now();

  const upcomingReminders = (recentNotes ?? []).filter(
    (item) => {
      if (
        item.is_done ||
        item.type !== 'reminder' ||
        !item.reminder_at_iso
      ) {
        return false;
      }

      const reminderTime = new Date(
        item.reminder_at_iso
      ).getTime();

      return (
        !Number.isNaN(reminderTime) &&
        reminderTime > now
      );
    }
  );

  const summaryInput = [
    ...todayNotes,
    ...upcomingReminders.slice(0, 5),
  ];

  const summary = await generateSummary(summaryInput);

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

        important_count: todayNotes.filter(
          (item) => item.is_important
        ).length,

        reminder_count: upcomingReminders.length,

        done_count: todayNotes.filter(
          (item) => item.is_done
        ).length,
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