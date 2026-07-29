const openai = require('../config/openai');
const supabase = require('../config/supabase');

async function detectPatterns(userId) {
  if (!userId) {
    throw new Error(
      "Utilisateur non identifié pour l'analyse des habitudes."
    );
  }

  const { data: notes, error } = await supabase
    .from('notes')
    .select(
      `
        id,
        text,
        created_at_iso,
        type,
        category,
        reminder_at_iso,
        is_important,
        is_done
      `
    )
    .eq('user_id', userId)
    .order('created_at_iso', { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  if (!notes || notes.length === 0) {
    return {
      summary:
        "Daya n'a pas encore assez de captures pour analyser tes habitudes.",
      habits: [],
      activeProjects: [],
      stalledProjects: [],
      repeatedTasks: [],
      frequentPeople: [],
      priorities: [],
      advice: [
        'Ajoute régulièrement tes idées, tâches et décisions dans Daya.',
      ],
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
Tu es Daya, un assistant personnel spécialisé dans l'analyse des habitudes.

Tu analyses uniquement les captures fournies.
Tu ne dois jamais inventer une personne, un projet, une tâche ou une décision.

Réponds uniquement avec un JSON valide ayant exactement cette structure :

{
  "summary": "synthèse courte",
  "habits": ["habitude observée"],
  "activeProjects": [
    {
      "name": "nom du projet",
      "reason": "raison courte",
      "activityLevel": "forte | moyenne | faible"
    }
  ],
  "stalledProjects": [
    {
      "name": "nom du projet",
      "reason": "raison courte"
    }
  ],
  "repeatedTasks": ["tâche souvent répétée ou reportée"],
  "frequentPeople": ["personne souvent citée"],
  "priorities": ["priorité actuelle"],
  "advice": ["conseil concret"]
}

Règles :
- maximum 5 éléments par tableau ;
- les conseils doivent venir des données ;
- n'affirme pas qu'une tâche est reportée sans indice suffisant ;
- un projet ne doit être considéré comme stagnant que si les notes le suggèrent réellement ;
- écris en français.
        `,
      },
      {
        role: 'user',
        content: `
Voici les captures personnelles de l'utilisateur :

${JSON.stringify(notes, null, 2)}
        `,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error(
      "Daya n'a retourné aucune analyse."
    );
  }

  let result;

  try {
    result = JSON.parse(content);
  } catch {
    throw new Error(
      "L'analyse des habitudes n'est pas dans un format valide."
    );
  }

  return {
    summary: result.summary || '',
    habits: Array.isArray(result.habits)
      ? result.habits
      : [],
    activeProjects: Array.isArray(result.activeProjects)
      ? result.activeProjects
      : [],
    stalledProjects: Array.isArray(result.stalledProjects)
      ? result.stalledProjects
      : [],
    repeatedTasks: Array.isArray(result.repeatedTasks)
      ? result.repeatedTasks
      : [],
    frequentPeople: Array.isArray(result.frequentPeople)
      ? result.frequentPeople
      : [],
    priorities: Array.isArray(result.priorities)
      ? result.priorities
      : [],
    advice: Array.isArray(result.advice)
      ? result.advice
      : [],
  };
}

module.exports = {
  detectPatterns,
};