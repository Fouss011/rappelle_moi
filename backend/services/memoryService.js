const openai = require('../config/openai');
const supabase = require('../config/supabase');
const {
  getLivingMemory,
} = require('./livingMemoryService');

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s'-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSimpleGreeting(text) {
  const normalized = normalizeText(text);

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
  const normalized = normalizeText(text);

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
  const normalized = normalizeText(text);

  if (normalized.includes('bonsoir')) {
    return 'Bonsoir 👋 Que veux-tu retrouver dans ta mémoire ?';
  }

  if (normalized.includes('bonjour')) {
    return 'Bonjour 👋 Que veux-tu retrouver dans ta mémoire ?';
  }

  return 'Salut 👋 Que veux-tu retrouver dans ta mémoire ?';
}

function getClosingResponse(text) {
  const normalized = normalizeText(text);

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

const STOP_WORDS = new Set([
  'a',
  'ai',
  'as',
  'au',
  'aux',
  'avec',
  'ce',
  'ces',
  'cet',
  'cette',
  'dans',
  'de',
  'des',
  'du',
  'elle',
  'en',
  'est',
  'et',
  'il',
  'ils',
  'je',
  'j',
  'la',
  'le',
  'les',
  'ma',
  'mes',
  'mon',
  'nous',
  'on',
  'ou',
  'par',
  'pas',
  'pour',
  'qu',
  'que',
  'quel',
  'quelle',
  'quelles',
  'quels',
  'qui',
  'sa',
  'ses',
  'son',
  'sur',
  'ta',
  'te',
  'tes',
  'toi',
  'tu',
  'un',
  'une',
  'vos',
  'votre',
  'vous',
  'y',
  'information',
  'informations',
  'info',
  'infos',
  'note',
  'notes',
  'rappel',
  'rappels',
  'idee',
  'idees',
  'memoire',
  'souvenir',
  'souvenirs',
  'enregistre',
  'enregistree',
  'enregistrees',
  'enregistrer',
  'retrouve',
  'retrouver',
]);

function tokenize(text) {
  return normalizeText(text)
    .split(' ')
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length >= 2 &&
        !STOP_WORDS.has(word)
    );
}

function isGeneralMemoryQuestion(question) {
  const normalized = normalizeText(question);

  const patterns = [
    "qu'ai je enregistre",
    'qu ai je enregistre',
    "qu'est ce que j'ai enregistre",
    'qu est ce que j ai enregistre',
    "qu'est ce que j'ai dans daya",
    'qu est ce que j ai dans daya',
    "qu'ai je dans daya",
    'qu ai je dans daya',
    'montre moi mes notes',
    'montre mes notes',
    'ai je des notes',
    "qu'y a t il dans ma memoire",
    'que contient ma memoire',
    'mes derniers souvenirs',
    'mes dernieres notes',
  ];

  return patterns.some((pattern) =>
    normalized.includes(pattern)
  );
}

function isDayaSubjectQuestion(question) {
  const normalized = normalizeText(question);

  if (!normalized.includes('daya')) {
    return false;
  }

  if (isGeneralMemoryQuestion(question)) {
    return false;
  }

  const containerPatterns = [
    'dans daya',
    'enregistre dans daya',
    'enregistree dans daya',
    'enregistrees dans daya',
    'mes notes daya',
    'ma memoire daya',
  ];

  if (
    containerPatterns.some((pattern) =>
      normalized.includes(pattern)
    )
  ) {
    return false;
  }

  return true;
}

function buildSearchTerms(question) {
  const terms = tokenize(question);

  if (isDayaSubjectQuestion(question)) {
    terms.push('daya');
  }

  return [...new Set(terms)];
}

function scoreNote(note, searchTerms, question) {
  const title = normalizeText(note.title || '');
  const text = normalizeText(note.text || '');
  const category = normalizeText(note.category || '');
  const combined = `${title} ${text} ${category}`.trim();

  if (!combined) {
    return 0;
  }

  let score = 0;

  for (const term of searchTerms) {
    if (title.includes(term)) {
      score += 8;
    }

    if (text.includes(term)) {
      score += 5;
    }

    if (category.includes(term)) {
      score += 3;
    }

    const occurrences =
      combined.split(term).length - 1;

    if (occurrences > 1) {
      score += Math.min(occurrences - 1, 3);
    }
  }

  const matchedTerms = searchTerms.filter((term) =>
    combined.includes(term)
  );

  if (matchedTerms.length >= 2) {
    score += matchedTerms.length * 4;
  }

  const normalizedQuestion = normalizeText(question);

  if (
    normalizedQuestion.length >= 4 &&
    combined.includes(normalizedQuestion)
  ) {
    score += 15;
  }

  if (note.is_important && score > 0) {
    score += 1;
  }

  return score;
}

function selectRelevantNotes(notes, question) {
  if (!Array.isArray(notes)) {
    return [];
  }

  if (isGeneralMemoryQuestion(question)) {
    return notes.slice(0, 12);
  }

  const searchTerms = buildSearchTerms(question);

  if (searchTerms.length === 0) {
    return notes.slice(0, 12);
  }

  return notes
    .map((note) => ({
      note,
      score: scoreNote(
        note,
        searchTerms,
        question
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const dateA = new Date(
        a.note.created_at_iso || 0
      ).getTime();

      const dateB = new Date(
        b.note.created_at_iso || 0
      ).getTime();

      return dateB - dateA;
    })
    .slice(0, 15)
    .map((item) => item.note);
}

function formatMemoryItems(notes) {
  return notes.map((note) => ({
    id: note.id,

    title:
      typeof note.title === 'string'
        ? note.title.trim()
        : '',

    text:
      typeof note.text === 'string'
        ? note.text.trim()
        : '',

    type: note.type || 'note',

    category:
      typeof note.category === 'string'
        ? note.category.trim()
        : '',

    createdAt: note.created_at_iso || null,

    reminderAt:
      note.reminder_at_iso || null,

    done: Boolean(note.is_done),

    important: Boolean(note.is_important),
  }));
}

function formatLivingMemory(livingMemory) {
  if (!livingMemory) {
    return null;
  }

  return {
    personalSummary:
      livingMemory.personal_summary || '',

    activeProjects:
      livingMemory.active_projects || [],

    goals:
      livingMemory.goals || [],

    importantPeople:
      livingMemory.important_people || [],

    recurringTopics:
      livingMemory.recurring_topics || [],

    preferences:
      livingMemory.preferences || [],

    openLoops:
      livingMemory.open_loops || [],

    lastAnalysisAt:
      livingMemory.last_analysis_at || null,
  };
}

function memoryItemMatchesTerms(item, searchTerms) {
  if (!item || searchTerms.length === 0) {
    return false;
  }

  const searchableText = normalizeText(
    [
      item.label || '',
      item.description || '',
    ].join(' ')
  );

  return searchTerms.some((term) =>
    searchableText.includes(term)
  );
}

function filterLivingMemoryForQuestion(
  livingMemory,
  question
) {
  if (!livingMemory) {
    return null;
  }

  // Pour une question globale, toute la mémoire
  // vivante peut être utile.
  if (isGeneralMemoryQuestion(question)) {
    return formatLivingMemory(livingMemory);
  }

  const searchTerms = buildSearchTerms(question);

  if (searchTerms.length === 0) {
    return null;
  }

  const filterSection = (section) => {
    if (!Array.isArray(section)) {
      return [];
    }

    return section.filter((item) =>
      memoryItemMatchesTerms(
        item,
        searchTerms
      )
    );
  };

  const filtered = {
    personalSummary: '',

    activeProjects: filterSection(
      livingMemory.active_projects
    ),

    goals: filterSection(
      livingMemory.goals
    ),

    importantPeople: filterSection(
      livingMemory.important_people
    ),

    recurringTopics: filterSection(
      livingMemory.recurring_topics
    ),

    preferences: filterSection(
      livingMemory.preferences
    ),

    openLoops: filterSection(
      livingMemory.open_loops
    ),
  };

  const hasRelevantContent =
    filtered.activeProjects.length > 0 ||
    filtered.goals.length > 0 ||
    filtered.importantPeople.length > 0 ||
    filtered.recurringTopics.length > 0 ||
    filtered.preferences.length > 0 ||
    filtered.openLoops.length > 0;

  return hasRelevantContent
    ? filtered
    : null;
}

function hasRelevantMemory(
  relevantNotes,
  relevantLivingMemory
) {
  return (
    relevantNotes.length > 0 ||
    Boolean(relevantLivingMemory)
  );
}

function getMissingMemoryResponse(question) {
  const searchTerms =
    buildSearchTerms(question);

  if (isDayaSubjectQuestion(question)) {
    return (
      "Je n'ai trouvé aucune information sur Daya dans ta mémoire. " +
      "Si tu veux rechercher autre chose, je suis là."
    );
  }

  if (searchTerms.length === 1) {
    const subject = searchTerms[0];

    return (
      `Je n'ai trouvé aucune information sur ${subject} dans ta mémoire. ` +
      "Si tu veux rechercher autre chose, je suis là."
    );
  }

  return (
    "Je n'ai trouvé aucune information correspondant à ta recherche dans ta mémoire. " +
    "Si tu veux essayer une autre recherche, je suis là."
  );
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

  const [{ data: notes, error }, livingMemoryResult] =
    await Promise.all([
      supabase
        .from('notes')
        .select(`
          id,
          title,
          text,
          type,
          category,
          created_at_iso,
          reminder_at_iso,
          is_done,
          is_important
        `)
        .eq('user_id', userId)
        .order('created_at_iso', {
          ascending: false,
        })
        .limit(300),

      getLivingMemory(userId).catch((memoryError) => {
        console.warn(
          'Impossible de charger la mémoire vivante :',
          memoryError.message
        );

        return null;
      }),
    ]);

  if (error) {
    throw new Error(error.message);
  }

  const userNotes = notes || [];

  if (userNotes.length === 0) {
  return (
    "Je ne trouve encore aucune information dans ta mémoire. " +
    "Ajoute quelques notes dans Daya, puis repose-moi ta question."
  );
}

  const relevantNotes =
  selectRelevantNotes(
    userNotes,
    cleanQuestion
  );

const relevantLivingMemory =
  filterLivingMemoryForQuestion(
    livingMemoryResult,
    cleanQuestion
  );

/**
 * Question précise + aucune preuve pertinente :
 * on s'arrête immédiatement.
 *
 * OpenAI n'est même pas appelé.
 */
if (
  !isGeneralMemoryQuestion(cleanQuestion) &&
  !hasRelevantMemory(
    relevantNotes,
    relevantLivingMemory
  )
) {
  return getMissingMemoryResponse(
    cleanQuestion
  );
}

const memoryItems =
  formatMemoryItems(relevantNotes);

const livingMemoryContext =
  isGeneralMemoryQuestion(cleanQuestion)
    ? formatLivingMemory(
        livingMemoryResult
      )
    : relevantLivingMemory;

  const dayaSubject =
    isDayaSubjectQuestion(cleanQuestion);

  const generalQuestion =
    isGeneralMemoryQuestion(cleanQuestion);

  const response =
    await openai.chat.completions.create({
      model: 'gpt-4o-mini',

      temperature: 0,

      messages: [
        {
          role: 'system',

          content: `
Tu es Daya, l'agent mémoire personnel de l'utilisateur.

Tu disposes de deux niveaux de mémoire :

1. LA MÉMOIRE VIVANTE

Elle représente la compréhension globale et évolutive de la situation de l'utilisateur.

Elle peut contenir ses projets actifs, objectifs, personnes importantes, sujets récurrents, préférences et éléments encore en attente.

2. LES SOUVENIRS PRÉCIS

Ce sont les notes et rappels réellement enregistrés par l'utilisateur.

Ils servent de preuves concrètes.

Règles absolues :

1. Réponds uniquement à partir de la mémoire vivante et des souvenirs précis fournis.

2. N'invente jamais une information, une date, une personne, une décision ou un lien absent des données fournies.

3. Utilise la mémoire vivante pour comprendre le contexte général, les projets et les relations entre plusieurs souvenirs.

4. Utilise les souvenirs précis comme preuves concrètes et privilégie-les lorsqu'ils apportent une information plus récente ou plus précise.

5. Si les souvenirs précis contredisent la mémoire vivante, privilégie les souvenirs précis les plus récents.

6. Si plusieurs souvenirs concernent le même projet ou sujet, rapproche-les et fais une synthèse cohérente.

7. Si l'utilisateur demande où il en est avec un projet, synthétise l'état actuel à partir du profil vivant et des souvenirs disponibles. Mentionne les éléments encore ouverts si cela aide.

8. Si l'utilisateur demande s'il existe des informations sur un sujet, commence directement par dire ce que tu as retrouvé.

9. Ne commence jamais par "je n'ai pas d'informations spécifiques" si des éléments pertinents sont présents.

10. Si aucun élément fourni ne répond réellement à la question, dis simplement que tu n'as pas trouvé l'information recherchée.

11. Ne donne pas une liste de souvenirs sans rapport avec le sujet demandé.

12. Une note et un rappel peuvent tous les deux constituer un souvenir utile.

13. Utilise prioritairement les champs title et text des souvenirs précis.

14. Si une date ou une heure est disponible et utile, tu peux la mentionner.

15. Réponds en français, de manière naturelle, claire et concise.

16. N'utilise PAS de Markdown :
- pas de **texte en gras** ;
- pas de # ;
- pas de tableau Markdown.

Tu peux utiliser de simples puces avec le caractère •.

17. Pour une réponse contenant plusieurs éléments :
- donne d'abord une phrase de synthèse ;
- puis les éléments les plus utiles ;
- évite les phrases génériques inutiles.

18. Le mot "Daya" peut avoir deux sens.

S'il est explicitement le sujet recherché, traite Daya comme n'importe quel autre projet personnel.

S'il désigne l'application dans une question globale sur ce qui est enregistré, traite-le comme le contenant de la mémoire.

IMPORTANT :

Les données qui te sont fournies ont déjà été filtrées
pour répondre à la question actuelle.

Ne mentionne jamais un autre projet, une autre personne,
un autre rappel ou un autre sujet simplement parce qu'il
existe dans la mémoire de l'utilisateur.

Une information personnelle peut être vraie tout en étant
hors sujet pour la question actuelle.

Les expressions techniques "mémoire vivante",
"souvenirs précis", "profil mémoire" ou "preuves"
sont internes au système.

Ne les utilise jamais dans une réponse destinée
à l'utilisateur.

Contexte d'interprétation de cette question :

Daya est-il le SUJET recherché ?
${dayaSubject ? 'OUI' : 'NON'}

La question demande-t-elle un aperçu GLOBAL de la mémoire ?
${generalQuestion ? 'OUI' : 'NON'}
          `.trim(),
        },

        {
          role: 'user',

          content: `
Question de l'utilisateur :

${cleanQuestion}

PROFIL DE MÉMOIRE VIVANTE :

${JSON.stringify(
  livingMemoryContext,
  null,
  2
)}

SOUVENIRS PRÉCIS RETROUVÉS :

${JSON.stringify(
  memoryItems,
  null,
  2
)}

Réponds à la question en combinant intelligemment le profil de mémoire vivante et les souvenirs précis.

La mémoire vivante sert au contexte général.

Les souvenirs précis servent de preuves concrètes.

Ne transforme jamais une information générale du profil vivant en fait plus précis qu'elle ne l'est.
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