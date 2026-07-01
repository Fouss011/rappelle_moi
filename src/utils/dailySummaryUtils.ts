import { prepareNotesForSummary } from './summaryUtils';

export function generateDailySummary(notes: any[]) {
  const data = prepareNotesForSummary(notes);

  const totalNotes = data.length;

  const importantCount = data.filter(
    (item) => item.important
  ).length;

  const doneCount = data.filter(
    (item) => item.termine
  ).length;

  const reminderCount = data.filter(
    (item) => item.type === 'reminder'
  ).length;

  const priorities = data
    .filter((item) => item.important)
    .slice(0, 5);

  let summary = '';

  summary += `📝 ${totalNotes} notes enregistrées\n`;
  summary += `⭐ ${importantCount} notes importantes\n`;
  summary += `🔔 ${reminderCount} rappels programmés\n`;
  summary += `✅ ${doneCount} tâches terminées\n\n`;

  if (priorities.length > 0) {
    summary += 'Priorités détectées :\n';

    priorities.forEach((item) => {
      summary += `• ${item.texte}\n`;
    });
  }

  return summary;
}