export function detectSmartReminder(text: string) {
  const lower = text.toLowerCase();

  // demain 13h / demain à 13h30
  const tomorrowMatch = lower.match(
    /demain\s*(?:à|a)?\s*(\d{1,2})h(\d{0,2})?/
  );

  if (tomorrowMatch) {
    return buildDateFromMatch(tomorrowMatch, 1);
  }

  // ce soir 18h / ce soir à 20h30
  const tonightMatch = lower.match(
    /ce soir\s*(?:à|a)?\s*(\d{1,2})h(\d{0,2})?/
  );

  if (tonightMatch) {
    return buildDateFromMatch(tonightMatch, 0);
  }

  // dans 2 heures
  const hoursLaterMatch = lower.match(/dans\s*(\d+)\s*heure/);

  if (hoursLaterMatch) {
    const hours = Number(hoursLaterMatch[1]);
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date;
  }

  // dans 30 minutes
  const minutesLaterMatch = lower.match(/dans\s*(\d+)\s*minute/);

  if (minutesLaterMatch) {
    const minutes = Number(minutesLaterMatch[1]);
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    return date;
  }

  // dans 3 jours
const daysLaterMatch = lower.match(/dans\s*(\d+)\s*jour/);

if (daysLaterMatch) {
  const days = Number(daysLaterMatch[1]);

  const date = new Date();

  date.setDate(date.getDate() + days);

  return date;
}

  const weekdays = [
  { name: 'dimanche', value: 0 },
  { name: 'lundi', value: 1 },
  { name: 'mardi', value: 2 },
  { name: 'mercredi', value: 3 },
  { name: 'jeudi', value: 4 },
  { name: 'vendredi', value: 5 },
  { name: 'samedi', value: 6 },
];

for (const day of weekdays) {
  const regex = new RegExp(
    `${day.name}\\s*(?:à|a)?\\s*(\\d{1,2})h(\\d{0,2})?`
  );

  const match = lower.match(regex);

  if (match) {
    const hour = Number(match[1]);
    const minute = match[2]
      ? Number(match[2])
      : 0;

    return getNextWeekday(
      day.value,
      hour,
      minute
    );
  }
}

  return null;
}

function buildDateFromMatch(match: RegExpMatchArray, dayOffset: number) {
  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);

  return date;
}

function getNextWeekday(targetDay: number, hour: number, minute: number) {
  const now = new Date();

  const result = new Date();

  const currentDay = result.getDay();

  let diff = targetDay - currentDay;

  if (diff <= 0) {
    diff += 7;
  }

  result.setDate(result.getDate() + diff);
  result.setHours(hour, minute, 0, 0);

  return result;
}