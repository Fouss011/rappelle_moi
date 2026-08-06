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

  if (isSimpleGreeting(cleanQuestion)) {
    return getGreetingResponse(cleanQuestion);
  }

  if (isConversationClosing(cleanQuestion)) {
    return getClosingResponse(cleanQuestion);
  }

  const { data: notes, error } = await supabase
    .from('notes')
    .select(`
      id,
      title,
      text,
      type,
      created_at_iso,
      reminder_at_iso,
      is_done,
      is_important
    `)
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

  const memoryItems = notes.map((note) => ({
    title:
      typeof note.title === 'string'
        ? note.title.trim()
        : '',
    text:
      typeof note.text === 'string'
        ? note.text.trim()
        : '',
    type: note.type,
    createdAt: note.created_at_iso,
    reminderAt: note.reminder_at_iso,
    done: Boolean(note.is_done),
    important: Boolean(note.is_important),
  }));

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
            "Les éléments fournis correspondent aux notes et rappels enregistrés dans l'application Daya. " +
            "Quand l'utilisateur demande s'il possède une note, une idée, un rappel ou une information 'dans Daya', " +
            "il parle généralement de ce qui est enregistré dans l'application, et non d'un sujet intitulé Daya. " +
            "Ne considère Daya comme le sujet recherché que si l'utilisateur demande explicitement une note 'à propos de Daya' ou 'sur le projet Daya'. " +
            "Pour une question générale comme 'Ai-je des notes ?', 'Qu'ai-je enregistré ?' ou 'As-tu une idée dans Daya ?', " +
            "confirme l'existence des éléments et présente quelques exemples pertinents. " +
            "Utilise principalement les champs title et text. " +
            "Le champ type indique s'il s'agit d'une note ou d'un rappel. " +
            "Si l'information demandée n'apparaît réellement pas dans les éléments fournis, dis-le clairement. " +
            "N'invente jamais de fait, de date ou de décision. " +
            "Réponds en français de manière claire, chaleureuse et concise.",
        },
        {
          role: 'user',
          content: `
Question de l'utilisateur :

${cleanQuestion}

Éléments enregistrés dans Daya :

${JSON.stringify(memoryItems, null, 2)}
          `.trim(),
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