const openai = require('../config/openai');
const supabase = require('../config/supabase');

const MAX_ITEMS_PER_SECTION = 8;
const ANALYSIS_VERSION = 2;

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

  return 0.35;
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

  /**
   * Évite les doublons dans une même rubrique.
   * Exemple : "Daya" et "daya".
   */
  const uniqueItems = new Map();

  for (const item of normalizedItems) {
    const key = item.label.toLowerCase();

    const existingItem = uniqueItems.get(key);

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

      evidenceNoteIds: mergedEvidenceIds,

      lastSeenAt:
        getMostRecentDate(
          existingItem.lastSeenAt,
          item.lastSeenAt
        ),
    });
  }

  return Array.from(uniqueItems.values())
    .sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }

      return getDateTimestamp(b.lastSeenAt) -
        getDateTimestamp(a.lastSeenAt);
    })
    .slice(0, maxItems);
}

function getDateTimestamp(value) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function getMostRecentDate(firstValue, secondValue) {
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

  return secondTimestamp > firstTimestamp
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
      `${importantPeople[0].label} apparaît dans les éléments personnels ou les actions récentes.`
    );
  }

  if (recurringTopics.length > 0) {
    fragments.push(
      `Le sujet ${recurringTopics[0].label} revient régulièrement.`
    );
  }

  if (openLoops.length > 0) {
    fragments.push(
      `${openLoops.length} élément(s) semblent encore en attente de résolution.`
    );
  }

  if (fragments.length === 0) {
    return (
      "Daya dispose de notes, mais n'a pas encore assez " +
      "d'indices fiables pour produire un profil détaillé."
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

  const { data: notes, error: notesError } =
    await supabase
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
    throw new Error(notesError.message);
  }

  const userNotes = notes ?? [];

  if (userNotes.length === 0) {
    const nowIso = new Date().toISOString();

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
      last_analysis_at: nowIso,

      analysis_version:
        ANALYSIS_VERSION,

      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from('user_memory_profiles')
      .upsert(emptyProfile, {
        onConflict: 'user_id',
      })
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

  /**
   * On envoie une version claire des notes à l'IA.
   * Le titre intelligent l'aide à identifier rapidement
   * le sujet central de chaque capture.
   */
  const preparedNotes = userNotes.map((note) => ({
    id: note.id,

    title:
      typeof note.title === 'string'
        ? note.title
        : '',

    text:
      typeof note.text === 'string'
        ? note.text
        : '',

    createdAt:
      note.created_at_iso ?? null,

    type:
      note.type ?? 'note',

    category:
      note.category ?? 'autre',

    reminderAt:
      note.reminder_at_iso ?? null,

    important:
      Boolean(note.is_important),

    done:
      Boolean(note.is_done),
  }));

  const response =
    await openai.chat.completions.create({
      model: 'gpt-4o-mini',

      temperature: 0.2,

      response_format: {
        type: 'json_object',
      },

      messages: [
        {
          role: 'system',

          content: `
Tu es Daya, un moteur de mémoire personnelle évolutive.

Ton rôle est de comprendre progressivement la situation actuelle de l'utilisateur à partir de ses notes.

Tu dois produire un profil utile, prudent, concret et compréhensible.

Tu ne dois jamais inventer :
- une relation familiale ou amoureuse ;
- une profession ;
- une préférence ;
- un projet ;
- un objectif ;
- une décision ;
- un problème ;
- une information personnelle absente des notes.

Tu peux toutefois faire une observation prudente lorsqu'elle est directement soutenue par une ou plusieurs notes.

Exemple autorisé :
"Rachel est une personne fréquemment mentionnée."

Exemple interdit :
"Rachel est l'épouse de l'utilisateur."
Sauf si cette relation est explicitement écrite dans les notes.

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

DIFFÉRENCE ENTRE LES RUBRIQUES

1. activeProjects

Un projet est un ensemble structuré ou une initiative suivie dans le temps.

Exemples :
- Daya ;
- SNPT ;
- création d'une application ;
- formation professionnelle ;
- lancement d'un site.

Une simple tâche comme "acheter du lait" n'est pas un projet.

Lorsqu'une note mentionne une tâche liée à un projet connu, tu peux reconnaître le projet.

Exemple :
"Réserver le domaine Daya"
peut servir de preuve pour le projet "Daya".

IMPORTANT

Si une tâche mentionne clairement le nom d'un projet, d'une application,
d'une entreprise, d'un logiciel ou d'un produit, tu dois créer le projet
correspondant même si une seule note en parle.

Exemples :

"Réserver le domaine Daya"
→ Projet : Daya

"Finir la documentation SNPT"
→ Projet : SNPT

"Corriger le backend Fretlôme"
→ Projet : Fretlôme

"Préparer la présentation Moulédi"
→ Projet : Moulédi

Le projet représente le contexte global.

La tâche représente une action.

Les deux peuvent exister simultanément.

Un projet peut donc être créé même si la note parle uniquement d'une tâche liée à ce projet.

2. goals

Un objectif représente un résultat que l'utilisateur souhaite atteindre.

Exemples :
- lancer Daya ;
- terminer une formation ;
- publier une application ;
- finir une documentation ;
- améliorer son organisation.

Un objectif peut appartenir à un projet.

Un objectif peut être créé dès qu'une note exprime clairement un résultat à atteindre.

Exemples :

- Finir la documentation
- Réserver le domaine
- Corriger les notifications
- Publier l'application
- Déployer le backend
- Terminer la formation

Même avec une seule preuve claire, un objectif peut être conservé avec une confiance comprise entre 0.55 et 0.70.

Un objectif est différent d'une tâche.

Exemple :

"Réserver le domaine Daya"

Projet :
Daya

Objectif :
Mettre en ligne Daya

Tâche en attente :
Réserver le domaine

3. importantPeople

Une personne peut être conservée lorsque :
- son nom apparaît plusieurs fois ;
- une action importante concerne cette personne ;
- elle semble jouer un rôle récurrent.

Ne déduis jamais la nature exacte de la relation si elle n'est pas écrite.

Une seule mention faible doit conduire à une confiance faible.

4. recurringTopics

Un sujet récurrent est un thème qui revient dans plusieurs notes.

Exemples :
- notifications ;
- développement mobile ;
- démarches administratives ;
- Supabase ;
- travail ;
- formation.

Ne mets pas un sujet dans cette rubrique s'il apparaît une seule fois, sauf s'il était déjà fortement présent dans l'ancien profil.

5. preferences

Une préférence doit être explicitement indiquée.

Exemples :
- "Je préfère travailler le soir."
- "Je n'aime pas les notifications bruyantes."
- "Je veux une interface simple."

Une action ou un problème ne constitue pas automatiquement une préférence.

6. openLoops

Un open loop est un élément qui semble encore demander une action ou une résolution.

Exemples :
- tâche non terminée ;
- problème non résolu ;
- décision à prendre ;
- document à finir ;
- personne à appeler ;
- domaine à réserver.

Règles pour openLoops :
- n'inclus pas une note dont done vaut true ;
- évite d'y mettre un projet entier si une action précise suffit ;
- une note sans heure peut quand même être un open loop ;
- une tâche terminée ne doit plus apparaître.

RÈGLES SUR LE RÉSUMÉ PERSONNEL

personalSummary doit :
- contenir 2 à 4 phrases courtes ;
- expliquer ce qui occupe l'utilisateur actuellement ;
- mentionner en priorité les projets actifs, les objectifs principaux et les personnes les plus importantes lorsqu'ils existent ;
- rester prudent ;
- ne jamais écrire "aucune information personnelle disponible" lorsque des notes existent ;
- ne jamais inventer une identité ou une relation.

RÈGLES SUR LA CONFIANCE

confidence doit être comprise entre 0 et 1.

Utilise approximativement :
- 0.90 à 0.98 : information explicite et répétée ;
- 0.75 à 0.89 : information explicite avec plusieurs preuves ;
- 0.55 à 0.74 : information appuyée par une seule preuve claire ;
- 0.35 à 0.54 : hypothèse prudente ou signal faible ;
- en dessous de 0.35 : information trop faible, à éviter.

Ne mets pas systématiquement 0.5.

RÈGLES SUR LES PREUVES

- Chaque élément doit contenir au moins un evidenceNoteIds lorsque cela est possible.
- Utilise uniquement les IDs présents dans les captures fournies.
- lastSeenAt doit correspondre à la date de la preuve la plus récente.
- Maximum 8 éléments par rubrique.
- Écris uniquement en français.
- Utilise des labels courts et clairs.
- Évite les doublons.
- Ne conserve pas une ancienne information si les nouvelles notes la contredisent clairement.
          `,
        },

        {
          role: 'user',

          content: `
Voici l'ancien profil. Il sert uniquement de contexte historique :

${JSON.stringify(existingProfile ?? null, null, 2)}

Voici les notes actuelles de l'utilisateur :

${JSON.stringify(preparedNotes, null, 2)}

Construis maintenant le nouveau profil de mémoire vivante.
          `,
        },
      ],
    });

  const content =
    response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      "Daya n'a retourné aucun profil mémoire."
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error(
      'JSON mémoire invalide :',
      content
    );

    throw new Error(
      'Le profil mémoire retourné par Daya est invalide.'
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

  const generatedSummary =
    typeof parsed.personalSummary === 'string'
      ? parsed.personalSummary
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 900)
      : '';

  const personalSummary =
    generatedSummary ||
    buildFallbackSummary({
      activeProjects,
      goals,
      importantPeople,
      recurringTopics,
      openLoops,
    });

  const latestNoteDate =
    userNotes[0]?.created_at_iso ?? null;

  const nowIso = new Date().toISOString();

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