import { API_URL } from '../config/api';

export type RelatedMemoryNote = {
  id: string;
  title?: string | null;
  text: string;
  created_at_iso?: string | null;
  type?: string | null;
  category?: string | null;
  reminder_at_iso?: string | null;
  is_done?: boolean | null;
};

export type MemoryConnection = {
  sourceNoteId: string;
  title: string;
  explanation: string;
  relatedNotes: RelatedMemoryNote[];
  keywords: string[];
  people: string[];
  projects: string[];
  topics: string[];
};

type RelatedNotesResponse = {
  success: boolean;
  sourceNoteId?: string;
  title?: string;
  explanation?: string;
  relatedNotes?: RelatedMemoryNote[];
  keywords?: string[];
  people?: string[];
  projects?: string[];
  topics?: string[];
  error?: string;
};

type ConnectionFeedbackStatus = 'confirmed' | 'rejected';

export async function findRelatedNotesForMemory({
  text,
  accessToken,
  excludeNoteId,
}: {
  text: string;
  accessToken: string;
  excludeNoteId?: string;
}): Promise<{
  success: boolean;
  connection?: MemoryConnection | null;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_URL}/api/ai/related-notes`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          excludeNoteId,
        }),
      }
    );

    let data: RelatedNotesResponse;

    try {
      data = await response.json();
    } catch {
      return {
        success: false,
        error: 'Réponse serveur invalide.',
      };
    }

    if (!response.ok || !data.success) {
      return {
        success: false,
        error:
          data.error ||
          'Impossible de rechercher les souvenirs liés.',
      };
    }

    const relatedNotes = Array.isArray(data.relatedNotes)
      ? data.relatedNotes
      : [];

    if (relatedNotes.length === 0) {
      return {
        success: true,
        connection: null,
      };
    }

    return {
      success: true,
      connection: {
        sourceNoteId:
          typeof data.sourceNoteId === 'string'
            ? data.sourceNoteId
            : excludeNoteId ?? '',
        title:
          typeof data.title === 'string'
            ? data.title.trim()
            : '',
        explanation:
          typeof data.explanation === 'string'
            ? data.explanation.trim()
            : '',
        relatedNotes,
        keywords: Array.isArray(data.keywords)
          ? data.keywords.slice(0, 8)
          : [],
        people: Array.isArray(data.people)
          ? data.people.slice(0, 5)
          : [],
        projects: Array.isArray(data.projects)
          ? data.projects.slice(0, 5)
          : [],
        topics: Array.isArray(data.topics)
          ? data.topics.slice(0, 8)
          : [],
      },
    };
  } catch (error) {
    console.error(
      'Erreur recherche mémoire liée :',
      error
    );

    return {
      success: false,
      error: 'Impossible de contacter le serveur.',
    };
  }
}

export async function saveMemoryConnectionFeedback({
  accessToken,
  sourceNoteId,
  relatedNoteIds,
  status,
}: {
  accessToken: string;
  sourceNoteId: string;
  relatedNoteIds: string[];
  status: ConnectionFeedbackStatus;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${API_URL}/api/ai/memory-connections/feedback`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceNoteId,
          relatedNoteIds,
          status,
        }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      return {
        success: false,
        error:
          data?.error ||
          "Impossible d'enregistrer ce choix mémoire.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur validation connexion mémoire :', error);
    return {
      success: false,
      error: 'Impossible de contacter le serveur.',
    };
  }
}

export async function getConfirmedMemoryCluster({
  accessToken,
  noteIds,
}: {
  accessToken: string;
  noteIds: string[];
}): Promise<{
  success: boolean;
  noteIds: string[];
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_URL}/api/ai/memory-connections/cluster`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ noteIds }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      return {
        success: false,
        noteIds,
        error:
          data?.error ||
          'Impossible de retrouver le fil confirmé.',
      };
    }

    return {
      success: true,
      noteIds: Array.isArray(data.noteIds)
        ? data.noteIds
        : noteIds,
    };
  } catch (error) {
    console.error('Erreur lecture fil mémoire confirmé :', error);
    return {
      success: false,
      noteIds,
      error: 'Impossible de contacter le serveur.',
    };
  }
}


export type ConfirmedMemoryConnection = {
  id: string;
  title: string;
  preview: string;
  noteIds: string[];
  noteCount: number;
  lastActivityAt?: string | null;
};

export async function getConfirmedMemoryConnections(
  accessToken: string
): Promise<{
  success: boolean;
  connections: ConfirmedMemoryConnection[];
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_URL}/api/ai/memory-connections`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      return {
        success: false,
        connections: [],
        error:
          data?.error ||
          'Impossible de charger les connexions mémoire.',
      };
    }

    return {
      success: true,
      connections: Array.isArray(data.connections)
        ? data.connections
        : [],
    };
  } catch (error) {
    console.error('Erreur liste connexions mémoire :', error);
    return {
      success: false,
      connections: [],
      error: 'Impossible de contacter le serveur.',
    };
  }
}
