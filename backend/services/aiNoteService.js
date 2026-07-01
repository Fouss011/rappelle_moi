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

async function analyseNote(text) {
  const todayIso = formatDate(new Date());

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `
Tu analyses une note utilisateur pour une application de mémoire personnelle.

Date actuelle : ${todayIso}

Réponds uniquement en JSON valide avec ce format :
{
  "type": "note" | "reminder",
  "title": "string",
  "category": "idee" | "tache" | "rappel" | "personnel" | "autre",
  "priority": "low" | "normal" | "high",
  "dateExpression": "string" | null,
  "time": "HH:mm" | null,
  "confidence": number
}

Règles :
- Ne calcule jamais toi-même la date finale.
- Si l'utilisateur dit demain, vendredi, lundi prochain, dans 15 jours, etc. mets cette expression exacte dans dateExpression.
- Si l'utilisateur donne une date exacte comme 2026-07-12, mets-la dans dateExpression.
- Si la phrase contient une date, une heure ou une intention de rappel => type reminder.
- Sinon => type note.
- Le title doit être court et clair.
        `,
      },
      {
        role: 'user',
        content: text,
      },
    ],
  });

  const analysis = JSON.parse(response.choices[0].message.content);

  const resolvedDate = resolveDateExpression(analysis.dateExpression);

  return {
    ...analysis,
    date: resolvedDate,
  };
}

module.exports = {
  analyseNote,
};