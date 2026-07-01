const openai = require('../config/openai');
const supabase = require('../config/supabase');

async function askMemory(question) {
  const { data: notes, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at_iso', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          "Tu es l'agent mémoire personnel de l'utilisateur. Tu réponds uniquement à partir de ses notes. Si l'information n'est pas dans les notes, dis-le clairement.",
      },
      {
        role: 'user',
        content: `
Question de l'utilisateur :
${question}

Voici ses notes récentes :
${JSON.stringify(notes, null, 2)}

Réponds en français de façon claire, utile et concise.
`,
      },
    ],
  });

  return response.choices[0].message.content;
}

module.exports = {
  askMemory,
};