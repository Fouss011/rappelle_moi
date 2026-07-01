import { API_URL } from '../config/api';

export type AiNoteAnalysis = {
  type: 'note' | 'reminder';
  title: string;
  category: 'idee' | 'tache' | 'rappel' | 'personnel' | 'autre';
  priority: 'low' | 'normal' | 'high';
  dateExpression?: string | null;
  date?: string | null;
  time?: string | null;
  confidence: number;
};

export async function analyseNoteWithAI(text: string): Promise<AiNoteAnalysis | null> {
  try {
    const response = await fetch(`${API_URL}/api/ai/analyse-note`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return null;
    }

    return data.analysis;
  } catch (error) {
    console.log('Erreur analyse note IA:', error);
    return null;
  }
}