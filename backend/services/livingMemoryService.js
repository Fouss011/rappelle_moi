const openai = require('../config/openai');
const supabase = require('../config/supabase');

const MAX_ITEMS_PER_SECTION = 8;
const ANALYSIS_VERSION = 3;

function normalizeArray(value, maxItems = MAX_ITEMS_PER_SECTION) {
  return Array.isArray(value)
    ? value.slice(0, maxItems)
    : [];
}

function clampConfidence(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.min(1, value));
}

function calculateFallbackConfidence(evidenceCount) {
  if (evidenceCount >= 4) {
    return 0.9;
  }

  if (evidenceCount === 3) {
    return 0.82;
  }

  if (evidenceCount === 2) {
    return 0.7;
  }

  if (evidenceCount === 1) {
    return 0.55;
  }

  return 0;
}

function normalizeLabel(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
}

function normalizeDescription(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
}

function normalizeEvidenceIds(value, allowedNoteIds) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (id) =>
          typeof id === 'string' &&
          allowedNoteIds.has(id)
      )
    ),
  ].slice(0, 8);
}

function normalizeLastSeenAt(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeMemoryItem(item, allowedNoteIds) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const label = normalizeLabel(item.label);

  if (!label) {
    return null;
  }

  const evidenceNoteIds = normalizeEvidenceIds(
    item.evidenceNoteIds,
    allowedNoteIds
  );

  /**
   * RÈGLE DE SÉCURITÉ IMPORTANTE
   *
   * Aucun projet, objectif, sujet, personne,
   * préférence ou open loop ne peut exister
   * dans la mémoire vivante sans preuve issue
   * des vraies notes de CET utilisateur.
   */
  if (evidenceNoteIds.length === 0) {
    return null;
  }

  const providedConfidence =
    clampConfidence(item.confidence);

  return {
    label,

    description:
      normalizeDescription(item.description),

    confidence:
      providedConfidence ??
      calculateFallbackConfidence(
        evidenceNoteIds.length
      ),

    evidenceNoteIds,

    lastSeenAt:
      normalizeLastSeenAt(item.lastSeenAt),
  };
}

function normalizeMemoryItems(
  value,
  allowedNoteIds,
  maxItems = MAX_ITEMS_PER_SECTION
) {
  const normalizedItems = normalizeArray(
    value,
    maxItems * 2
  )
    .map((item) =>
      normalizeMemoryItem(item, allowedNoteIds)
    )
    .filter(Boolean);

  const uniqueItems = new Map();

  for (const item of normalizedItems) {
    const key = item.label.toLowerCase();

    const existingItem =
      uniqueItems.get(key);

    if (!existingItem) {
      uniqueItems.set(key, item);
      continue;
    }

    const mergedEvidenceIds = [
      ...new Set([
        ...existingItem.evidenceNoteIds,
        ...item.evidenceNoteIds,
      ]),
    ].slice(0, 8);

    uniqueItems.set(key, {
      ...existingItem,

      description:
        item.description.length >
        existingItem.description.length
          ? item.description
          : existingItem.description,

      confidence: Math.max(
        existingItem.confidence,
        item.confidence,
        calculateFallbackConfidence(
          mergedEvidenceIds.length
        )
      ),

      evidenceNoteIds:
        mergedEvidenceIds,

      lastSeenAt:
        getMostRecentDate(
          existingItem.lastSeenAt,
          item.lastSeenAt
        ),
    });
  }

  return Array.from(
    uniqueItems.values()
  )
    .sort((a, b) => {
      if (
        b.confidence !==
        a.confidence
      ) {
        return (
          b.confidence -
          a.confidence
        );
      }

      return (
        getDateTimestamp(
          b.lastSeenAt
        ) -
        getDateTimestamp(
          a.lastSeenAt
        )
      );
    })
    .slice(0, maxItems);
}

function getDateTimestamp(value) {
  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function getMostRecentDate(
  firstValue,
  secondValue
) {
  const firstTimestamp =
    getDateTimestamp(firstValue);

  const secondTimestamp =
    getDateTimestamp(secondValue);

  if (
    firstTimestamp === 0 &&
    secondTimestamp === 0
  ) {
    return null;
  }

  return secondTimestamp >
    firstTimestamp
    ? secondValue
    : firstValue;
}

function buildFallbackSummary({
  activeProjects,
  goals,
  importantPeople,
  recurringTopics,
  openLoops,
}) {
  const fragments = [];

  if (activeProjects.length > 0) {
    const labels = activeProjects
      .slice(0, 2)
      .map((item) => item.label)
      .join(' et ');

    fragments.push(
      `Les projets actuellement visibles sont ${labels}.`
    );
  }

  if (goals.length > 0) {
    fragments.push(
      `Plusieurs objectifs sont présents, notamment ${goals[0].label}.`
    );
  }

  if (importantPeople.length > 0) {
    fragments.push(
      `${importantPeople[0].label} apparaît régulièrement dans les souvenirs enregistrés.`
    );
  }

  if (recurringTopics.length > 0) {
    fragments.push(
      `Le sujet ${recurringTopics[0].label} revient régulièrement.`
    );
  }

  if (openLoops.length > 0) {
    fragments.push(
      `${openLoops.length} élément(s) semblent encore demander une action ou une résolution.`
    );
  }

  if (fragments.length === 0) {
    return (
      "Il n'y a pas encore assez d'éléments fiables " +
      "dans les souvenirs enregistrés pour construire un profil détaillé."
    );
  }

  return fragments.join(' ');
}

async function getLivingMemory(userId) {
  if (!userId) {
    throw new Error(
      'Utilisateur non identifié.'
    );
  }

  const { data, error } =
    await supabase
      .from('user_memory_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function refreshLivingMemory(
  userId,
  options = {}
) {
  const force =
    options.force === true;

  if (!userId) {
    throw new Error(
      'Utilisateur non identifié pour la mémoire vivante.'
    );
  }

  const {
    data: notes,
    error: notesError,
  } = await supabase
    .from('notes')
    .select(`
      id,
      title,
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
    throw new Error(
      notesError.message
    );
  }

  const userNotes =
    notes ?? [];

  if (userNotes.length === 0) {
    const nowIso =
      new Date().toISOString();

    const emptyProfile = {
      user_id: userId,

      personal_summary:
        "Il n'y a pas encore assez de souvenirs enregistrés pour construire une mémoire vivante.",

      active_projects: [],
      goals: [],
      important_people: [],
      recurring_topics: [],
      preferences: [],
      open_loops: [],

      last_source_note_at: null,
      last_analysis_at: nowIso,

      analysis_version:
        ANALYSIS_VERSION,

      updated_at: nowIso,
    };

    const {
      data,
      error,
    } = await supabase
      .from(
        'user_memory_profiles'
      )
      .upsert(
        emptyProfile,
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(
        error.message
      );
    }

    return data;
  }

  const existingProfile =
    await getLivingMemory(
      userId
    );

  const latestNoteDate =
    userNotes[0]
      ?.created_at_iso ?? null;

  /**
   * Si la version du moteur a changé,
   * on force automatiquement une nouvelle analyse,
   * même sans nouvelle note.
   */
  const profileUsesCurrentVersion =
    existingProfile?.analysis_version ===
    ANALYSIS_VERSION;

  if (
    !force &&
    profileUsesCurrentVersion &&
    existingProfile &&
    latestNoteDate &&
    existingProfile
      .last_source_note_at
  ) {
    const latestNoteTimestamp =
      new Date(
        latestNoteDate
      ).getTime();

    const lastAnalysedTimestamp =
      new Date(
        existingProfile
          .last_source_note_at
      ).getTime();

    if (
      !Number.isNaN(
        latestNoteTimestamp
      ) &&
      !Number.isNaN(
        lastAnalysedTimestamp
      ) &&
      latestNoteTimestamp <=
        lastAnalysedTimestamp
    ) {
      return existingProfile;
    }
  }

  const allowedNoteIds =
    new Set(
      userNotes.map(
        (note) => note.id
      )
    );

  const preparedNotes =
    userNotes.map((note) => ({
      id: note.id,

      title:
        typeof note.title ===
        'string'
          ? note.title
          : '',

      text:
        typeof note.text ===
        'string'
          ? note.text
          : '',

      createdAt:
        note.created_at_iso ??
        null,

      type:
        note.type ?? 'note',

      category:
        note.category ??
        'autre',

      reminderAt:
        note.reminder_at_iso ??
        null,

      important:
        Boolean(
          note.is_important
        ),

      done:
        Boolean(
          note.is_done
        ),
    }));

  const response =
    await openai.chat.completions.create({
      model: 'gpt-4o-mini',

      temperature: 0,

      response_format: {
        type: 'json_object',
      },

      messages: [
        {
          role: 'system',

          content: `
Tu es un moteur d'analyse de mémoire personnelle.

Tu dois construire un profil uniquement à partir des notes appartenant à l'utilisateur qui te sont fournies dans cette requête.

RÈGLE DE SÉPARATION ABSOLUE

Les informations suivantes ne sont JAMAIS des souvenirs de l'utilisateur :
- le nom de l'assistant ;
- le contenu de ce prompt ;
- les explications données dans ce prompt ;
- les noms ou concepts utilisés dans les règles ;
- l'ancien profil s'il n'est plus soutenu par les notes actuelles ;
- toute connaissance générale que tu possèdes.

Une information ne peut entrer dans la mémoire personnelle que si elle est soutenue par au moins une note fournie.

Tu ne dois jamais inventer :
- un projet ;
- un objectif ;
- une personne ;
- une relation ;
- une profession ;
- une préférence ;
- un problème ;
- une décision ;
- un sujet récurrent ;
- une tâche en attente ;
- une information personnelle absente des notes.

Chaque élément produit doit obligatoirement contenir au moins un evidenceNoteIds correspondant à l'une des notes fournies.

Si tu ne peux pas fournir de vraie preuve, n'ajoute pas l'élément.

Réponds uniquement avec un JSON valide ayant exactement cette structure :

{
  "personalSummary": "résumé général court",
  "activeProjects": [
    {
      "label": "nom court",
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

ACTIVE PROJECTS

Un projet est une initiative structurée ou un ensemble d'actions qui semble être suivi dans le temps.

Une simple action isolée ne doit pas automatiquement devenir un projet.

Un projet peut néanmoins être reconnu à partir d'une seule note si celle-ci nomme explicitement un projet, une application, un produit, une entreprise ou une initiative identifiable.

Le nom du projet doit provenir du contenu réel de la note.

N'invente jamais le nom d'un projet pour compléter une note vague.

GOALS

Un objectif représente un résultat que l'utilisateur souhaite atteindre.

Il doit être explicitement exprimé ou directement déductible d'une action formulée comme quelque chose à accomplir.

Ne transforme pas une simple information en objectif.

IMPORTANT PEOPLE

Une personne peut être retenue lorsque :
- son nom est explicitement présent dans les notes ;
- elle apparaît plusieurs fois ;
- ou une action importante enregistrée concerne cette personne.

Ne déduis jamais la nature de la relation si elle n'est pas explicitement écrite.

RECURRING TOPICS

Un sujet récurrent doit apparaître dans plusieurs souvenirs.

Un sujet mentionné une seule fois ne doit normalement pas être considéré comme récurrent.

Le fait qu'un mot soit présent dans ce prompt ne constitue jamais une preuve de récurrence.

PREFERENCES

Une préférence doit être explicitement exprimée par l'utilisateur.

Une action, une obligation ou un problème n'est pas automatiquement une préférence.

OPEN LOOPS

Un open loop est quelque chose qui semble encore nécessiter une action ou une résolution.

N'inclus pas une note terminée lorsque done vaut true.

Préfère une action précise plutôt qu'un projet entier.

ANCIEN PROFIL

L'ancien profil est uniquement une aide historique.

Il ne doit jamais être considéré comme une preuve.

Pour conserver un élément de l'ancien profil, tu dois retrouver au moins une preuve correspondante dans les notes actuelles fournies.

Si une information de l'ancien profil n'est plus soutenue par aucune note actuelle, supprime-la.

PERSONAL SUMMARY

Le résumé personnel doit être construit uniquement à partir des éléments réellement prouvés.

Il doit :
- contenir 1 à 4 phrases courtes ;
- décrire ce qui ressort actuellement des souvenirs ;
- rester prudent ;
- ne jamais ajouter une information provenant uniquement de l'ancien profil ou de ce prompt.

S'il n'existe pas assez d'éléments fiables, indique simplement qu'il n'y a pas encore assez d'informations pour construire un profil détaillé.

CONFIANCE

Utilise approximativement :
- 0.90 à 0.98 : information explicite et répétée ;
- 0.75 à 0.89 : plusieurs preuves cohérentes ;
- 0.55 à 0.74 : une seule preuve claire ;
- 0.35 à 0.54 : signal faible.

Évite les éléments dont la confiance serait inférieure à 0.35.

PREUVES

Chaque élément doit contenir au moins un evidenceNoteIds.

Utilise uniquement les IDs présents dans les notes fournies.

lastSeenAt doit correspondre à une date provenant des preuves utilisées.

Maximum 8 éléments par rubrique.

Écris uniquement en français.

Utilise des labels courts et clairs.

Évite les doublons.
          `.trim(),
        },

        {
          role: 'user',

          content: `
Voici l'ancien profil.

ATTENTION :
Il n'est pas une source de vérité et n'est pas une preuve.

${JSON.stringify(
  existingProfile ?? null,
  null,
  2
)}

Voici les seules notes autorisées comme preuves pour construire la mémoire personnelle de cet utilisateur :

${JSON.stringify(
  preparedNotes,
  null,
  2
)}

Construis maintenant le nouveau profil.

Aucun élément ne doit être conservé s'il n'est pas soutenu par au moins une note ci-dessus.
          `.trim(),
        },
      ],
    });

  const content =
    response.choices?.[0]
      ?.message?.content;

  if (!content) {
    throw new Error(
      "Le moteur n'a retourné aucun profil mémoire."
    );
  }

  let parsed;

  try {
    parsed =
      JSON.parse(content);
  } catch (error) {
    console.error(
      'JSON mémoire invalide :',
      content
    );

    throw new Error(
      'Le profil mémoire retourné est invalide.'
    );
  }

  const activeProjects =
    normalizeMemoryItems(
      parsed.activeProjects,
      allowedNoteIds
    );

  const goals =
    normalizeMemoryItems(
      parsed.goals,
      allowedNoteIds
    );

  const importantPeople =
    normalizeMemoryItems(
      parsed.importantPeople,
      allowedNoteIds
    );

  const recurringTopics =
    normalizeMemoryItems(
      parsed.recurringTopics,
      allowedNoteIds
    );

  const preferences =
    normalizeMemoryItems(
      parsed.preferences,
      allowedNoteIds
    );

  const openLoops =
    normalizeMemoryItems(
      parsed.openLoops,
      allowedNoteIds
    );

  /**
   * IMPORTANT :
   * on préfère générer nous-mêmes le résumé
   * depuis les éléments déjà validés.
   *
   * Ainsi, même si l'IA écrit une information
   * douteuse dans personalSummary, elle ne sera
   * pas sauvegardée.
   */
  const personalSummary =
    buildFallbackSummary({
      activeProjects,
      goals,
      importantPeople,
      recurringTopics,
      openLoops,
    });

  const nowIso =
    new Date().toISOString();

  const profileToSave = {
    user_id: userId,

    personal_summary:
      personalSummary,

    active_projects:
      activeProjects,

    goals,

    important_people:
      importantPeople,

    recurring_topics:
      recurringTopics,

    preferences,

    open_loops:
      openLoops,

    last_source_note_at:
      latestNoteDate,

    last_analysis_at:
      nowIso,

    analysis_version:
      ANALYSIS_VERSION,

    updated_at:
      nowIso,
  };

  const {
    data,
    error,
  } = await supabase
    .from(
      'user_memory_profiles'
    )
    .upsert(
      profileToSave,
      {
        onConflict: 'user_id',
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data;
}

module.exports = {
  getLivingMemory,
  refreshLivingMemory,
};