export async function generateAISummary(notes: any[]) {
  try {
    const response = await fetch(
      'http://192.168.1.16:4000/api/summary/generate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      }
    );

    const data = await response.json();

    return data.summary;
  } catch (error) {
    console.error(error);
    return "Impossible de générer le résumé IA.";
  }
}