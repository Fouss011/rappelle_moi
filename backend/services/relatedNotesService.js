const openai = require('../config/openai');
const supabase = require('../config/supabase');

async function findRelatedNotes(text, userId, options = {}) {
  const cleanText = text?.trim();

  if (!cleanText) {
    throw new Error('Texte manquant.');
  }

  if (!userId) {
    throw new Error(
      'Utilisateur non identifié pour la recherche des notes liées.'
    );
  }

  const { data: notes, error } = await supabase
    .from('notes')
    .select(
      'id, text, created_at_iso, type, category, reminder_at_iso, is_done'
    )
    .eq('user_id', userId)
    .order('created_at_iso', { ascending: false })
    .limit(120);

  if (error) {
    throw new Error(error.message);
  }

  const excludedNoteId =
    typeof options.excludeNoteId === 'string'
      ? options.excludeNoteId
      : null;

  const existingNotes = (notes ?? []).filter(
    (note) => note.id !== excludedNoteId
  );

  if (existingNotes.length === 0) {
    return {
      title: '',
      keywords: [],
      people: [],
      projects: [],
      topics: [],
      relatedNotes: [],
      explanation: '',
    };
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: {
      type: 'json_object',
    },
    messages: [
      {
        role: 'system',
        content: `
Tu es le moteur de liaison de la mémoire Daya.

Tu analyses une nouvelle capture et tu la compares uniquement aux notes personnelles fournies.

Réponds uniquement avec ce JSON valide :

{
  "title": "titre court",
  "keywords": ["mot-clé"],
  "people": ["personne"],
  "projects": ["projet"],
  "topics": ["sujet"],
  "relatedIds": ["identifiant"],
  "explanation": "explication courte"
}

Règles :
- maximum 5 relatedIds ;
- chaque identifiant doit exister dans les notes fournies ;
- compare par sens, contexte, projet, personne ou décision ;
- ne crée jamais un identifiant ;
- si aucune note n'est liée, relatedIds doit être [];
- n'invente aucune personne ni aucun projet ;
- réponds en français.
        `,
      },
      {
        role: 'user',
        content: `
Nouvelle capture :

${cleanText}

Notes personnelles existantes :

${JSON.stringify(existingNotes, null, 2)}
        `,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error(
      "Daya n'a retourné aucun résultat."
    );
  }

  let result;

  try {
    result = JSON.parse(content);
  } catch {
    throw new Error(
      'La réponse des notes liées est invalide.'
    );
  }

  const allowedIds = new Set(
    existingNotes.map((note) => note.id)
  );

  const relatedIds = Array.isArray(result.relatedIds)
    ? result.relatedIds
        .filter((id) => allowedIds.has(id))
        .slice(0, 5)
    : [];

  const relatedNotes = existingNotes.filter((note) =>
    relatedIds.includes(note.id)
  );

  return {
    title:
      typeof result.title === 'string'
        ? result.title
        : '',
    keywords: Array.isArray(result.keywords)
      ? result.keywords.slice(0, 8)
      : [],
    people: Array.isArray(result.people)
      ? result.people.slice(0, 5)
      : [],
    projects: Array.isArray(result.projects)
      ? result.projects.slice(0, 5)
      : [],
    topics: Array.isArray(result.topics)
      ? result.topics.slice(0, 8)
      : [],
    relatedNotes,
    explanation:
      typeof result.explanation === 'string'
        ? result.explanation
        : '',
  };
}

module.exports = {
  findRelatedNotes,
};