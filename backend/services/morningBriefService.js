const openai = require('../config/openai');
const supabase = require('../config/supabase');

async function generateMorningBrief() {
  const { data: summaries } = await supabase
    .from('daily_summaries')
    .select('*')
    .order('summary_date', { ascending: false })
    .limit(1);

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .order('created_at_iso', { ascending: false })
    .limit(50);

  const yesterdaySummary =
    summaries?.[0]?.summary_text ?? 'Aucun résumé disponible.';

  const pendingTasks = (notes ?? []).filter((item) => !item.is_done);
  const reminders = (notes ?? []).filter((item) => item.type === 'reminder');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Tu es un assistant personnel qui prépare le briefing intelligent du matin.',
      },
      {
        role: 'user',
        content: `
Résumé récent :

${yesterdaySummary}

Tâches restantes :

${JSON.stringify(pendingTasks, null, 2)}

Rappels :

${JSON.stringify(reminders, null, 2)}

Prépare un briefing motivant en français.

Le briefing doit être court.

Maximum 10 lignes.
`,
      },
    ],
  });

  return response.choices[0].message.content;
}

module.exports = {
  generateMorningBrief,
};