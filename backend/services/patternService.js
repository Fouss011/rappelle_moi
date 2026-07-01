const openai = require('../config/openai');
const supabase = require('../config/supabase');

async function detectPatterns() {
  const { data: notes, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at_iso', { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          "Tu analyses les habitudes de l'utilisateur. Tu ne dois jamais inventer des informations. Analyse uniquement ce qui est présent dans les notes.",
      },
      {
        role: 'user',
        content: `
Analyse ces notes :

${JSON.stringify(notes, null, 2)}

Retourne :

1. Les habitudes observées
2. Les projets les plus fréquents
3. Les tâches souvent reportées
4. Les personnes souvent citées
5. Trois conseils personnalisés

Réponds en français.
`,
      },
    ],
  });

  return response.choices[0].message.content;
}

module.exports = {
  detectPatterns,
};