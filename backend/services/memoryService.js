const openai = require('../config/openai');
const supabase = require('../config/supabase');

function normalizeConversationText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, "'")
    .replace(/[!?.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSimpleGreeting(text) {
  const normalized = normalizeConversationText(text);

  const greetings = new Set([
    'bonjour',
    'bonsoir',
    'salut',
    'hello',
    'hi',
    'coucou',
    'hey',
    'bonjour daya',
    'bonsoir daya',
    'salut daya',
    'hello daya',
    'hi daya',
  ]);

  return greetings.has(normalized);
}

function isConversationClosing(text) {
  const normalized = normalizeConversationText(text);

  const closings = new Set([
    'merci',
    'merci beaucoup',
    'ok merci',
    'd accord merci',
    "d'accord merci",
    'super merci',
    'parfait merci',
    'c est bon merci',
    "c'est bon merci",
    'bonne nuit',
    'bonne journee',
    'bonne soiree',
    'a bientot',
    'au revoir',
    'bye',
  ]);

  return closings.has(normalized);
}

function getGreetingResponse(text) {
  const normalized = normalizeConversationText(text);

  if (normalized.includes('bonsoir')) {
    return 'Bonsoir 👋 Que veux-tu retrouver dans ta mémoire ?';
  }

  if (normalized.includes('bonjour')) {
    return 'Bonjour 👋 Que veux-tu retrouver dans ta mémoire ?';
  }

  return 'Salut 👋 Que veux-tu retrouver dans ta mémoire ?';
}

function getClosingResponse(text) {
  const normalized = normalizeConversationText(text);

  if (normalized.includes('bonne nuit')) {
    return 'Bonne nuit 🌙 Repose-toi bien.';
  }

  if (normalized.includes('bonne soiree')) {
    return 'Bonne soirée 👋 À bientôt.';
  }

  if (normalized.includes('bonne journee')) {
    return 'Bonne journée 👋 À bientôt.';
  }

  if (
    normalized.includes('au revoir') ||
    normalized.includes('bye') ||
    normalized.includes('a bientot')
  ) {
    return 'À bientôt 👋';
  }

  return 'Avec plaisir 😊';
}

async function askMemory(question, userId) {
  const cleanQuestion = question?.trim();

  if (!cleanQuestion) {
    throw new Error('Question manquante.');
  }

  if (!userId) {
    throw new Error('Utilisateur non identifié.');
  }

  /**
   * Un message social court est traité directement.
   *
   * Exemples :
   * "Bonjour" → salutation
   * "Merci" → conclusion
   *
   * Mais :
   * "Ai-je une note avec bonjour ?" → recherche
   * "Bonjour, ai-je parlé de Rachel ?" → recherche
   */
  if (isSimpleGreeting(cleanQuestion)) {
    return getGreetingResponse(cleanQuestion);
  }

  if (isConversationClosing(cleanQuestion)) {
    return getClosingResponse(cleanQuestion);
  }

  const { data: notes, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at_iso', {
      ascending: false,
    })
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

  const response =
    await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,

      messages: [
        {
          role: 'system',
          content:
            "Tu es Daya, l'agent mémoire personnel de l'utilisateur. " +
            "Tu réponds uniquement à partir des notes fournies. " +
            "Si l'information n'apparaît pas dans les notes, dis-le clairement. " +
            "N'invente jamais de fait, de date ou de décision. " +
            "Tu dois distinguer une simple salutation d'une recherche contenant le mot bonjour. " +
            "Tu dois distinguer un simple remerciement d'une phrase qui contient aussi une question. " +
            "Lorsqu'une vraie question est posée, réponds à la question sans te laisser distraire par les formules de politesse. " +
            "Réponds en français de manière claire, chaleureuse et concise.",
        },
        {
          role: 'user',
          content: `
Question de l'utilisateur :

${cleanQuestion}

Notes personnelles de l'utilisateur :

${JSON.stringify(notes, null, 2)}
`,
        },
      ],
    });

  return (
    response.choices?.[0]?.message?.content?.trim() ||
    "Je n'ai pas trouvé de réponse dans ta mémoire."
  );
}

module.exports = {
  askMemory,
};