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

async function generateMorningBrief(
  userId,
  timezone = 'Europe/Paris'
) {
  if (!userId) {
    throw new Error('userId manquant pour le briefing du matin.');
  }

  const { data: summaries, error: summariesError } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('user_id', userId)
    .order('summary_date', { ascending: false })
    .limit(1);

  if (summariesError) {
    throw new Error(summariesError.message);
  }

  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at_iso', { ascending: false })
    .limit(100);

  if (notesError) {
    throw new Error(notesError.message);
  }

  const now = Date.now();

  const upcomingReminders = (notes ?? [])
    .filter((item) => {
      if (
        item.is_done ||
        item.type !== 'reminder' ||
        !item.reminder_at_iso
      ) {
        return false;
      }

      const reminderTime = new Date(item.reminder_at_iso).getTime();

      return (
        !Number.isNaN(reminderTime) &&
        reminderTime > now
      );
    })
    .sort(
      (a, b) =>
        new Date(a.reminder_at_iso).getTime() -
        new Date(b.reminder_at_iso).getTime()
    )
    .slice(0, 5);

  const pendingTasks = (notes ?? [])
    .filter(
      (item) =>
        !item.is_done &&
        item.type !== 'reminder'
    )
    .slice(0, 5);

  const yesterdaySummary =
    summaries?.[0]?.summary_text ??
    'Aucun résumé récent disponible.';

  if (
    upcomingReminders.length === 0 &&
    pendingTasks.length === 0
  ) {
    return "Bonjour 👋 Tu n'as aucun rappel ni tâche urgente pour le moment.";
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Tu es Daya, un assistant personnel. Prépare un briefing du matin très court, chaleureux et concret. N’invente rien.',
      },
      {
        role: 'user',
        content: `
Date locale : ${getDateKey(new Date(), timezone)}

Résumé récent :
${yesterdaySummary}

Rappels futurs :
${JSON.stringify(upcomingReminders, null, 2)}

Tâches non terminées :
${JSON.stringify(pendingTasks, null, 2)}

Rédige une notification en français :
- maximum 350 caractères ;
- commence par "Bonjour 👋" ;
- mentionne au maximum 3 priorités ;
- n'inclus aucun rappel passé ;
- aucune mise en forme Markdown.
`,
      },
    ],
  });

  return (
    response.choices[0]?.message?.content?.trim() ||
    "Bonjour 👋 Consulte Daya pour retrouver tes priorités."
  );
}

module.exports = {
  generateMorningBrief,
};