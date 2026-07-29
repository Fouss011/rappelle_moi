const openai = require('../config/openai');
const supabase = require('../config/supabase');

async function askMemory(question, userId) {
  if (!question?.trim()) {
    throw new Error('Question manquante.');
  }

  if (!userId) {
    throw new Error('Utilisateur non identifié.');
  }

  const { data: notes, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at_iso', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  if (!notes || notes.length === 0) {
    return (
      "Je ne trouve encore aucune information dans ta mémoire. " +
      "Ajoute quelques captures dans Daya, puis repose-moi ta question."
    );
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          "Tu es Daya, l'agent mémoire personnel de l'utilisateur. " +
          "Tu réponds uniquement à partir des notes fournies. " +
          "Si l'information n'apparaît pas dans les notes, dis-le clairement. " +
          "N'invente jamais de fait, de date ou de décision.",
      },
      {
        role: 'user',
        content: `
Question de l'utilisateur :

${question.trim()}

Notes personnelles de l'utilisateur :

${JSON.stringify(notes, null, 2)}

Réponds en français de manière claire, chaleureuse et concise.
`,
      },
    ],
  });

  return (
    response.choices[0]?.message?.content?.trim() ||
    "Je n'ai pas trouvé de réponse dans ta mémoire."
  );
}

module.exports = {
  askMemory,
};