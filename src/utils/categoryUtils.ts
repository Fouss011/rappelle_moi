export function detectCategory(text: string) {
  const lower = text.toLowerCase();

  if (
    lower.includes('idée') ||
    lower.includes('idee')
  ) {
    return 'idee';
  }

  if (
    lower.includes('appeler') ||
    lower.includes('rappeler') ||
    lower.includes('réunion') ||
    lower.includes('reunion') ||
    lower.includes('rdv')
  ) {
    return 'rappel';
  }

  if (
    lower.includes('acheter') ||
    lower.includes('faire') ||
    lower.includes('envoyer')
  ) {
    return 'tache';
  }

  if (
    lower.includes('rachel') ||
    lower.includes('famille')
  ) {
    return 'personnel';
  }

  return 'autre';
}