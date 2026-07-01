const openai = require('../config/openai');

async function generateSummary(notes) {
  if (!notes || notes.length === 0) {
    return "Aucune note enregistrée aujourd'hui.";
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          "Tu es l'assistant mémoire personnel de l'utilisateur. Tu fais un résumé clair, utile et actionnable de ses notes de la journée.",
      },
      {
        role: 'user',
        content: `
Voici les notes du jour :

${JSON.stringify(notes, null, 2)}

Fais un résumé en français avec :
1. Les points importants
2. Les tâches à ne pas oublier
3. Les rappels détectés
4. Les priorités pour demain
`,
      },
    ],
  });

  return response.choices[0].message.content;
}

async function generateAndSaveDailySummary() {
  const supabase = require('../config/supabase');

  const today = new Date().toISOString().split('T')[0];

  const start = `${today}T00:00:00.000Z`;
  const end = `${today}T23:59:59.999Z`;

  const { data: notes, error } = await supabase
    .from('notes')
    .select('*')
    .gte('created_at_iso', start)
    .lte('created_at_iso', end);

  if (error) {
    throw new Error(error.message);
  }

  const summary = await generateSummary(notes);

  const { error: summaryError } = await supabase
    .from('daily_summaries')
    .upsert({
      id: today,
      summary_date: today,
      summary_text: summary,
      total_notes: notes.length,
      important_count: notes.filter((item) => item.is_important).length,
      reminder_count: notes.filter((item) => item.type === 'reminder').length,
      done_count: notes.filter((item) => item.is_done).length,
    });

  if (summaryError) {
    throw new Error(summaryError.message);
  }

  return summary;
}

module.exports = {
  generateSummary,
  generateAndSaveDailySummary,
};