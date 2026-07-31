const openai = require('../config/openai');

const WEEKDAYS = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

const TITLE_MAX_WORDS = 6;

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function resolveDateExpression(expression) {
  if (!expression) return null;

  const text = expression.toLowerCase().trim();
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (text.includes("aujourd")) {
    return formatDate(today);
  }

  if (text.includes('demain')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return formatDate(d);
  }

  const daysMatch = text.match(/dans\s+(\d+)\s+jours?/);
  if (daysMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() + Number(daysMatch[1]));
    return formatDate(d);
  }

  for (const [name, targetDay] of Object.entries(WEEKDAYS)) {
    if (text.includes(name)) {
      const d = new Date(today);
      const currentDay = d.getDay();
      let diff = targetDay - currentDay;

      if (diff <= 0) {
        diff += 7;
      }

      d.setDate(d.getDate() + diff);
      return formatDate(d);
    }
  }

  const isoMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    return isoMatch[0];
  }

  return null;
}

function cleanGeneratedTitle(title) {
  if (typeof title !== 'string') {
    return '';
  }

  const cleaned = title
    .replace(/[\r\n]+/g, ' ')
    .replace(/^["'«»]+|["'«»]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return '';
  }

  const words = cleaned.split(/\s+/);

  if (words.length <= TITLE_MAX_WORDS + 1) {
    return cleaned;
  }

  return `${words.slice(0, TITLE_MAX_WORDS + 1).join(' ')}`;
}

async function analyseNote(text) {
  const todayIso = formatDate(new Date());

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `
Tu analyses une note utilisateur pour une application de mémoire personnelle appelée Daya.

Date actuelle : ${todayIso}

Réponds uniquement en JSON valide avec exactement ce format :
{
  "type": "note" | "reminder",
  "title": "string",
  "category": "idee" | "tache" | "rappel" | "personnel" | "autre",
  "priority": "low" | "normal" | "high",
  "dateExpression": "string" | null,
  "time": "HH:mm" | null,
  "confidence": number
}

Règles générales :
- Ne calcule jamais toi-même la date finale.
- Si l'utilisateur dit demain, vendredi, lundi prochain, dans 15 jours, etc., mets cette expression exacte dans dateExpression.
- Si l'utilisateur donne une date exacte comme 2026-07-12, mets-la dans dateExpression.
- Si la phrase contient une date, une heure ou une intention explicite de rappel, utilise type "reminder".
- Sinon, utilise type "note".
- confidence doit être un nombre compris entre 0 et 1.

Règles strictes pour "title" :
- Le titre doit résumer l'action ou l'idée principale.
- Il doit contenir environ 2 à 6 mots.
- Il doit commencer par un seul emoji pertinent.
- Il ne doit pas recopier toute la phrase.
- Il ne doit pas contenir la date ni l'heure.
- Il ne doit pas commencer par "Je dois", "Il faut", "Penser à", "Ne pas oublier de" ou "Rappelle-moi de".
- Il doit conserver les noms propres et les noms de projets importants.
- Il ne doit pas finir par un point.

Exemples :
- "Je dois appeler Rachel demain à 18h" => "📞 Appeler Rachel"
- "Finir la documentation SNPT avant vendredi" => "📄 Documentation SNPT"
- "Penser à réserver le domaine Daya" => "🌐 Domaine Daya"
- "Acheter du lait en rentrant" => "🛒 Acheter du lait"
- "J'ai une idée pour améliorer la mémoire vivante" => "💡 Mémoire vivante"
        `,
      },
      {
        role: 'user',
        content: text,
      },
    ],
  });

  const rawContent = response.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error("L'IA n'a retourné aucune analyse.");
  }

  const analysis = JSON.parse(rawContent);
  const resolvedDate = resolveDateExpression(analysis.dateExpression);

  return {
    ...analysis,
    title: cleanGeneratedTitle(analysis.title),
    date: resolvedDate,
  };
}

module.exports = {
  analyseNote,
};
