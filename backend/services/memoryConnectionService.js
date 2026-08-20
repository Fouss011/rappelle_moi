const supabase = require('../config/supabase');

const VALID_STATUSES = new Set([
  'confirmed',
  'rejected',
]);

async function saveConnectionFeedback({
  userId,
  sourceNoteId,
  relatedNoteIds,
  status,
}) {
  if (!userId) {
    throw new Error('Utilisateur non identifié.');
  }

  if (!sourceNoteId?.trim()) {
    throw new Error('Note source manquante.');
  }

  if (!VALID_STATUSES.has(status)) {
    throw new Error('Statut de connexion invalide.');
  }

  const uniqueRelatedIds = [
    ...new Set(
      (Array.isArray(relatedNoteIds)
        ? relatedNoteIds
        : []
      )
        .filter((id) => typeof id === 'string')
        .map((id) => id.trim())
        .filter(
          (id) => id && id !== sourceNoteId
        )
    ),
  ].slice(0, 10);

  if (uniqueRelatedIds.length === 0) {
    throw new Error('Aucune note liée à enregistrer.');
  }

  const rows = uniqueRelatedIds.map(
    (relatedNoteId) => ({
      user_id: userId,
      source_note_id: sourceNoteId,
      related_note_id: relatedNoteId,
      status,
      updated_at: new Date().toISOString(),
    })
  );

  const { error } = await supabase
    .from('memory_connections')
    .upsert(rows, {
      onConflict:
        'user_id,source_note_id,related_note_id',
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    saved: rows.length,
    status,
  };
}

async function getConfirmedCluster({
  userId,
  noteIds,
}) {
  const seedIds = [
    ...new Set(
      (Array.isArray(noteIds) ? noteIds : [])
        .filter((id) => typeof id === 'string')
        .map((id) => id.trim())
        .filter(Boolean)
    ),
  ].slice(0, 30);

  if (!userId || seedIds.length === 0) {
    return seedIds;
  }

  const cluster = new Set(seedIds);
  let frontier = [...seedIds];

  // Deux passages suffisent pour une V1 de graphe mémoire
  // sans faire exploser le nombre de requêtes.
  for (let depth = 0; depth < 2; depth += 1) {
    if (frontier.length === 0) {
      break;
    }

    const quoted = frontier
      .map((id) => `"${id.replace(/"/g, '')}"`)
      .join(',');

    const { data, error } = await supabase
      .from('memory_connections')
      .select('source_note_id, related_note_id')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .or(
        `source_note_id.in.(${quoted}),related_note_id.in.(${quoted})`
      );

    if (error) {
      throw new Error(error.message);
    }

    const nextFrontier = [];

    for (const row of data ?? []) {
      for (const id of [
        row.source_note_id,
        row.related_note_id,
      ]) {
        if (id && !cluster.has(id)) {
          cluster.add(id);
          nextFrontier.push(id);
        }
      }
    }

    frontier = nextFrontier;
  }

  return [...cluster].slice(0, 60);
}

async function getDecidedRelatedIds({
  userId,
  sourceNoteId,
}) {
  if (!userId || !sourceNoteId) {
    return [];
  }

  const { data, error } = await supabase
    .from('memory_connections')
    .select('related_note_id')
    .eq('user_id', userId)
    .eq('source_note_id', sourceNoteId);

  if (error) {
    // La mémoire existante continue de fonctionner même si
    // la migration V4 n'a pas encore été appliquée.
    console.warn(
      'Historique de validation mémoire indisponible :',
      error.message
    );
    return [];
  }

  return (data ?? [])
    .map((item) => item.related_note_id)
    .filter(Boolean);
}



async function listConfirmedConnectionClusters({ userId }) {
  if (!userId) {
    return [];
  }

  const { data: edges, error: edgeError } = await supabase
    .from('memory_connections')
    .select('source_note_id, related_note_id, updated_at')
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .order('updated_at', { ascending: false });

  if (edgeError) {
    throw new Error(edgeError.message);
  }

  if (!edges?.length) {
    return [];
  }

  const adjacency = new Map();
  const allIds = new Set();
  const lastActivityById = new Map();

  function connect(a, b) {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a).add(b);
  }

  for (const edge of edges) {
    const source = edge.source_note_id;
    const related = edge.related_note_id;
    if (!source || !related) continue;

    allIds.add(source);
    allIds.add(related);
    connect(source, related);
    connect(related, source);

    const updatedAt = edge.updated_at || null;
    if (updatedAt) {
      for (const id of [source, related]) {
        const previous = lastActivityById.get(id);
        if (!previous || new Date(updatedAt) > new Date(previous)) {
          lastActivityById.set(id, updatedAt);
        }
      }
    }
  }

  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('id, title, text, created_at_iso')
    .eq('user_id', userId)
    .in('id', [...allIds]);

  if (notesError) {
    throw new Error(notesError.message);
  }

  const noteById = new Map((notes ?? []).map((note) => [note.id, note]));
  const visited = new Set();
  const clusters = [];

  for (const startId of allIds) {
    if (visited.has(startId)) continue;

    const queue = [startId];
    const clusterIds = [];
    visited.add(startId);

    while (queue.length) {
      const current = queue.shift();
      clusterIds.push(current);

      for (const next of adjacency.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }

    const clusterNotes = clusterIds
      .map((id) => noteById.get(id))
      .filter(Boolean)
      .sort((a, b) =>
        new Date(a.created_at_iso || 0) - new Date(b.created_at_iso || 0)
      );

    if (clusterNotes.length < 2) continue;

    const newest = clusterNotes[clusterNotes.length - 1];
    const oldest = clusterNotes[0];
    const title =
      oldest?.title?.trim() ||
      newest?.title?.trim() ||
      'Fil de réflexion';

    const lastActivityAt = clusterIds
      .map((id) => lastActivityById.get(id))
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0] ||
      newest?.created_at_iso ||
      null;

    clusters.push({
      id: clusterIds.slice().sort().join('__'),
      title,
      preview: newest?.text?.trim() || '',
      noteIds: clusterIds,
      noteCount: clusterNotes.length,
      lastActivityAt,
    });
  }

  return clusters
    .sort((a, b) =>
      new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0)
    )
    .slice(0, 100);
}

module.exports = {
  saveConnectionFeedback,
  getConfirmedCluster,
  getDecidedRelatedIds,
  listConfirmedConnectionClusters,
};
