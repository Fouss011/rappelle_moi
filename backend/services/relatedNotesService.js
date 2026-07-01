const openai = require('../config/openai');
const supabase = require('../config/supabase');

async function findRelatedNotes(text) {
  const { data: notes, error } = await supabase
    .from('notes')
    .select('id, text, created_at_iso, type, category')
    .order('created_at_iso', { ascending: false })
    .limit(120);

  if (error) {
    throw new Error(error.message);
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `
Tu es un moteur de mémoire personnelle.

Tu dois analyser une nouvelle idée ET la comparer aux notes existantes.

Réponds uniquement en JSON valide :
{
  "title": "titre court",
  "keywords": ["mot-clé 1", "mot-clé 2"],
  "people": ["personne"],
  "projects": ["projet"],
  "topics": ["sujet"],
  "relatedIds": ["id1", "id2"],
  "explanation": "explication courte"
}

Règles :
- Les keywords doivent décrire la nouvelle idée, même si aucune note liée n'existe.
- relatedIds doit contenir maximum 5 IDs présents dans les notes existantes.
- Si aucune note n'est liée, relatedIds = [].
- Compare par sens, pas seulement par mots exacts.
        `,
      },
      {
        role: 'user',
        content: `
Nouvelle idée :
${text}

Notes existantes :
${JSON.stringify(notes || [], null, 2)}
        `,
      },
    ],
  });

  const result = JSON.parse(response.choices[0].message.content);
  const relatedIds = Array.isArray(result.relatedIds) ? result.relatedIds : [];
  const relatedNotes = (notes || []).filter((note) => relatedIds.includes(note.id));

  return {
    title: result.title || '',
    keywords: result.keywords || [],
    people: result.people || [],
    projects: result.projects || [],
    topics: result.topics || [],
    relatedNotes,
    explanation: result.explanation || '',
  };
}

module.exports = {
  findRelatedNotes,
};