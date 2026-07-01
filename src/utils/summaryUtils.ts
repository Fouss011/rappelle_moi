type SummaryNote = {
  text: string;
  category: string;
  isImportant: boolean;
  isDone: boolean;
  type: 'note' | 'reminder';
  reminderAt?: string;
};

export function prepareNotesForSummary(notes: SummaryNote[]) {
  return notes.map((item) => ({
    texte: item.text,
    categorie: item.category,
    important: item.isImportant,
    termine: item.isDone,
    type: item.type,
    rappel: item.reminderAt ?? null,
  }));
}