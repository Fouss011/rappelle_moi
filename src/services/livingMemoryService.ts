import { API_URL } from '../config/api';

export type LivingMemoryItem = {
  label: string;
  description: string;
  confidence: number;
  evidenceNoteIds: string[];
  lastSeenAt?: string | null;
};

export type LivingMemoryProfile = {
  user_id: string;
  personal_summary: string;

  active_projects: LivingMemoryItem[];
  goals: LivingMemoryItem[];
  important_people: LivingMemoryItem[];
  recurring_topics: LivingMemoryItem[];
  preferences: LivingMemoryItem[];
  open_loops: LivingMemoryItem[];

  last_source_note_at?: string | null;
  last_analysis_at?: string | null;
  analysis_version: number;
};

type LivingMemoryResponse = {
  success: boolean;
  memory?: LivingMemoryProfile | null;
  error?: string;
};

async function readJsonResponse(
  response: Response
): Promise<LivingMemoryResponse> {
  try {
    return await response.json();
  } catch {
    return {
      success: false,
      error: 'Réponse serveur invalide.',
    };
  }
}

export async function getLivingMemory(
  accessToken: string
): Promise<LivingMemoryResponse> {
  try {
    const response = await fetch(
      `${API_URL}/api/ai/living-memory`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await readJsonResponse(response);

    if (!response.ok) {
      return {
        success: false,
        error:
          data.error ||
          'Impossible de lire la mémoire vivante.',
      };
    }

    return data;
  } catch (error) {
    console.error(
      'Erreur lecture mémoire vivante :',
      error
    );

    return {
      success: false,
      error: 'Impossible de contacter le serveur.',
    };
  }
}

export async function refreshLivingMemory(
  accessToken: string
): Promise<LivingMemoryResponse> {
  try {
    const response = await fetch(
      `${API_URL}/api/ai/living-memory/refresh`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    const data = await readJsonResponse(response);

    if (!response.ok) {
      return {
        success: false,
        error:
          data.error ||
          "Impossible d'actualiser la mémoire vivante.",
      };
    }

    return data;
  } catch (error) {
    console.error(
      'Erreur actualisation mémoire vivante :',
      error
    );

    return {
      success: false,
      error: 'Impossible de contacter le serveur.',
    };
  }
}