const openai = require('../config/openai');
const supabase = require('../config/supabase');

function normalizeArray(value, maxItems = 8) {
  return Array.isArray(value)
    ? value.slice(0, maxItems)
    : [];
}

function normalizeMemoryItem(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  return {
    label:
      typeof item.label === 'string'
        ? item.label.trim()
        : '',

    description:
      typeof item.description === 'string'
        ? item.description.trim()
        : '',

    confidence:
      typeof item.confidence === 'number'
        ? Math.max(0, Math.min(1, item.confidence))
        : 0.5,

    evidenceNoteIds: Array.isArray(item.evidenceNoteIds)
      ? item.evidenceNoteIds
          .filter((id) => typeof id === 'string')
          .slice(0, 8)
      : [],

    lastSeenAt:
      typeof item.lastSeenAt === 'string'
        ? item.lastSeenAt
        : null,
  };
}

function normalizeMemoryItems(value, maxItems = 8) {
  return normalizeArray(value, maxItems)
    .map(normalizeMemoryItem)
    .filter((item) => item && item.label);
}

async function getLivingMemory(userId) {
  if (!userId) {
    throw new Error('Utilisateur non identifié.');
  }

  const { data, error } = await supabase
    .from('user_memory_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function refreshLivingMemory(userId) {
  if (!userId) {
    throw new Error(
      'Utilisateur non identifié pour la mémoire vivante.'
    );
  }

  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select(`
      id,
      text,
      created_at_iso,
      type,
      category,
      reminder_at_iso,
      is_important,
      is_done
    `)
    .eq('user_id', userId)
    .order('created_at_iso', {
      ascending: false,
    })
    .limit(250);

  if (notesError) {
    throw new Error(notesError.message);
  }

  const userNotes = notes ?? [];

  if (userNotes.length === 0) {
    const emptyProfile = {
      user_id: userId,
      personal_summary:
        "Daya n'a pas encore assez de captures pour construire ce profil.",
      active_projects: [],
      goals: [],
      important_people: [],
      recurring_topics: [],
      preferences: [],
      open_loops: [],
      last_source_note_at: null,
      last_analysis_at: new Date().toISOString(),
      analysis_version: 1,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_memory_profiles')
      .upsert(emptyProfile)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  const existingProfile =
    await getLivingMemory(userId);

  const allowedNoteIds = new Set(
    userNotes.map((note) => note.id)
  );

  const response =
    await openai.chat.completions.create({
      model: 'gpt-4o-mini',

      response_format: {
        type: 'json_object',
      },

      messages: [
        {
          role: 'system',
          content: `
Tu es Daya, un moteur de mémoire personnelle évolutive.

Tu dois construire un profil utile uniquement à partir des captures fournies.

Tu ne dois jamais inventer :
- une personne ;
- une préférence ;
- un projet ;
- un objectif ;
- une décision ;
- un problème.

Chaque élément doit contenir des identifiants de notes qui servent de preuves.

Réponds uniquement avec un JSON valide :

{
  "personalSummary": "résumé général court",
  "activeProjects": [
    {
      "label": "nom",
      "description": "description courte",
      "confidence": 0.0,
      "evidenceNoteIds": ["id"],
      "lastSeenAt": "date ISO ou null"
    }
  ],
  "goals": [],
  "importantPeople": [],
  "recurringTopics": [],
  "preferences": [],
  "openLoops": []
}

Définition de openLoops :
tâches, décisions, engagements, problèmes ou projets qui semblent encore non résolus.

Règles :
- maximum 8 éléments par rubrique ;
- confidence doit être comprise entre 0 et 1 ;
- n'utilise que des IDs réellement présents ;
- un élément incertain doit avoir une confiance faible ;
- évite les informations trop intimes ou non nécessaires ;
- écris en français ;
- ne conserve pas une ancienne information si les nouvelles notes la contredisent.
          `,
        },
        {
          role: 'user',
          content: `
Ancien profil, s'il existe :

${JSON.stringify(existingProfile ?? null, null, 2)}

Captures récentes :

${JSON.stringify(userNotes, null, 2)}
          `,
        },
      ],
    });

  const content =
    response.choices[0]?.message?.content;

  if (!content) {
    throw new Error(
      "Daya n'a retourné aucun profil mémoire."
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(
      'Le profil mémoire retourné par Daya est invalide.'
    );
  }

  function cleanEvidence(items) {
    return normalizeMemoryItems(items).map((item) => ({
      ...item,
      evidenceNoteIds:
        item.evidenceNoteIds.filter((id) =>
          allowedNoteIds.has(id)
        ),
    }));
  }

  const latestNoteDate =
    userNotes[0]?.created_at_iso ?? null;

  const profileToSave = {
    user_id: userId,

    personal_summary:
      typeof parsed.personalSummary === 'string'
        ? parsed.personalSummary.trim()
        : '',

    active_projects: cleanEvidence(
      parsed.activeProjects
    ),

    goals: cleanEvidence(parsed.goals),

    important_people: cleanEvidence(
      parsed.importantPeople
    ),

    recurring_topics: cleanEvidence(
      parsed.recurringTopics
    ),

    preferences: cleanEvidence(
      parsed.preferences
    ),

    open_loops: cleanEvidence(
      parsed.openLoops
    ),

    last_source_note_at: latestNoteDate,

    last_analysis_at:
      new Date().toISOString(),

    analysis_version: 1,

    updated_at:
      new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_memory_profiles')
    .upsert(profileToSave, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

module.exports = {
  getLivingMemory,
  refreshLivingMemory,
};