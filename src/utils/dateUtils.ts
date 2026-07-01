export function isToday(dateIso: string) {
  const date = new Date(dateIso);
  const today = new Date();

  return date.toDateString() === today.toDateString();
}

export function isYesterday(dateIso: string) {
  const date = new Date(dateIso);
  const yesterday = new Date();

  yesterday.setDate(yesterday.getDate() - 1);

  return date.toDateString() === yesterday.toDateString();
}