import { API_URL } from '../config/api';

export type RelatedMemoryNote = {
  id: string;
  text: string;
  created_at_iso?: string | null;
  type?: string | null;
  category?: string | null;
  reminder_at_iso?: string | null;
  is_done?: boolean | null;
};

export type MemoryConnection = {
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
  title?: string;
  explanation?: string;
  relatedNotes?: RelatedMemoryNote[];
  keywords?: string[];
  people?: string[];
  projects?: string[];
  topics?: string[];
  error?: string;
};

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
