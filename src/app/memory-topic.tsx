import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../components/AppBackground';
import { useAuth } from '../context/AuthContext';
import { useNotes } from '../context/NotesContext';
import {
  getLivingMemory,
  type LivingMemoryItem,
  type LivingMemoryProfile,
} from '../services/livingMemoryService';
import {
  getConfirmedMemoryCluster,
} from '../services/relatedNotesService';
import { supabase } from '../services/supabase';

type TopicKind = 'project' | 'loop' | 'goal';

type TopicNote = {
  id: string;
  title?: string | null;
  text: string;
  created_at_iso?: string | null;
  type?: string | null;
  category?: string | null;
  is_done?: boolean | null;
};

type TopicState = {
  title: string;
  description: string;
  kindLabel: string;
  lastSeenAt?: string | null;
  evidenceNoteIds: string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getMemoryCollection(memory: LivingMemoryProfile, kind: TopicKind) {
  if (kind === 'project') return memory.active_projects ?? [];
  if (kind === 'loop') return memory.open_loops ?? [];
  return memory.goals ?? [];
}

function getKindLabel(kind?: TopicKind) {
  if (kind === 'project') return 'Projet';
  if (kind === 'loop') return 'À reprendre';
  if (kind === 'goal') return 'Objectif';
  return 'Connexion mémoire';
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function MemoryTopicScreen() {
  const params = useLocalSearchParams<{
    source?: string;
    kind?: string;
    label?: string;
    title?: string;
    description?: string;
    noteIds?: string;
  }>();

  const { user, session, loading: authLoading } = useAuth();
  const { updateNote } = useNotes();

  const [topic, setTopic] = useState<TopicState | null>(null);
  const [notes, setNotes] = useState<TopicNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [continuation, setContinuation] = useState('');
  const [savingContinuation, setSavingContinuation] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const source = firstParam(params.source);
  const kindParam = firstParam(params.kind) as TopicKind | undefined;
  const labelParam = firstParam(params.label)?.trim() ?? '';
  const titleParam = firstParam(params.title)?.trim() ?? '';
  const descriptionParam = firstParam(params.description)?.trim() ?? '';
  const noteIdsParam = firstParam(params.noteIds) ?? '';

  const connectionNoteIds = useMemo(
    () => noteIdsParam.split(',').map((item) => item.trim()).filter(Boolean),
    [noteIdsParam]
  );

  const loadTopic = useCallback(async () => {
    const accessToken = session?.access_token;
    if (!user?.id || !accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      let resolvedTopic: TopicState;

      if (source === 'connection') {
        resolvedTopic = {
          title: titleParam || 'Cette idée a une histoire',
          description: descriptionParam,
          kindLabel: 'Connexion mémoire',
          evidenceNoteIds: connectionNoteIds,
        };
      } else {
        const result = await getLivingMemory(accessToken);
        if (!result.success || !result.memory) {
          throw new Error(result.error || 'Impossible de retrouver ce sujet dans la mémoire.');
        }

        const collection = getMemoryCollection(result.memory, kindParam ?? 'project');
        const normalizedLabel = labelParam.toLowerCase();
        const item: LivingMemoryItem | undefined = collection.find(
          (candidate) => candidate.label.trim().toLowerCase() === normalizedLabel
        );

        if (!item) {
          throw new Error('Ce sujet a évolué ou n’est plus présent dans la mémoire actuelle.');
        }

        resolvedTopic = {
          title: item.label,
          description: item.description,
          kindLabel: getKindLabel(kindParam),
          lastSeenAt: item.lastSeenAt,
          evidenceNoteIds: item.evidenceNoteIds ?? [],
        };
      }

      if (resolvedTopic.evidenceNoteIds.length > 0) {
        const clusterResult = await getConfirmedMemoryCluster({
          accessToken,
          noteIds: resolvedTopic.evidenceNoteIds,
        });

        if (clusterResult.success) {
          resolvedTopic = {
            ...resolvedTopic,
            evidenceNoteIds: clusterResult.noteIds,
          };
        }
      }

      setTopic(resolvedTopic);

      if (resolvedTopic.evidenceNoteIds.length === 0) {
        setNotes([]);
        return;
      }

      const { data, error } = await supabase
        .from('notes')
        .select('id, title, text, created_at_iso, type, category, is_done')
        .eq('user_id', user.id)
        .in('id', resolvedTopic.evidenceNoteIds);

      if (error) throw new Error(error.message);

      const sortedNotes = [...(data ?? [])].sort(
        (a, b) =>
          new Date(b.created_at_iso ?? 0).getTime() -
          new Date(a.created_at_iso ?? 0).getTime()
      );

      setNotes(sortedNotes as TopicNote[]);
    } catch (error) {
      console.error('Erreur fiche mémoire :', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Impossible de charger ce souvenir.'
      );
    } finally {
      setLoading(false);
    }
  }, [
    connectionNoteIds,
    descriptionParam,
    kindParam,
    labelParam,
    session?.access_token,
    source,
    titleParam,
    user?.id,
  ]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    void loadTopic();
  }, [authLoading, loadTopic, user]);

  const saveContinuation = useCallback(async () => {
    const clean = continuation.trim();
    const target = notes[0];
    if (!clean || !target) return;

    setSavingContinuation(true);
    const nextText = `${target.text.trim()}\n\n${clean}`;
    const success = await updateNote(target.id, nextText);
    setSavingContinuation(false);

    if (success) {
      setNotes((current) =>
        current.map((item) =>
          item.id === target.id ? { ...item, text: nextText } : item
        )
      );
      setContinuation('');
    }
  }, [continuation, notes, updateNote]);

  if (authLoading || loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingTitle}>Daya rassemble tes souvenirs…</Text>
        <Text style={styles.loadingText}>On reconstitue le fil de ce sujet.</Text>
      </View>
    );
  }

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerEyebrow}>FIL DE MÉMOIRE</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {topic?.title || 'Souvenir'}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Daya n’a pas retrouvé ce fil</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {topic ? (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.kindPill}>
                  <Text style={styles.kindPillText}>{topic.kindLabel}</Text>
                </View>
                <Text style={styles.summaryTitle}>Ce que Daya retient</Text>
                <Text style={styles.summaryText}>
                  {topic.description ||
                    'Daya a retrouvé plusieurs notes qui appartiennent au même fil.'}
                </Text>
                {topic.lastSeenAt ? (
                  <Text style={styles.lastSeenText}>
                    Dernière trace : {formatDate(topic.lastSeenAt)}
                  </Text>
                ) : null}
              </View>

              {notes.length > 0 ? (
                <View style={styles.continueCard}>
                  <Text style={styles.continueEyebrow}>CONTINUER</Text>
                  <Text style={styles.continueTitle}>Poursuis cette réflexion</Text>
                  <Text style={styles.continueHint}>
                    Ta suite sera ajoutée à la note la plus récente de ce fil et restera visible dans Mes notes.
                  </Text>
                  <TextInput
                    style={styles.continueInput}
                    value={continuation}
                    onChangeText={setContinuation}
                    multiline
                    placeholder="Ajoute une idée, une décision, une nouvelle piste…"
                    placeholderTextColor="#94A3B8"
                  />
                  <TouchableOpacity
                    style={[styles.continueButton, !continuation.trim() && styles.disabledButton]}
                    onPress={() => void saveContinuation()}
                    disabled={!continuation.trim() || savingContinuation}
                  >
                    <Text style={styles.continueButtonText}>
                      {savingContinuation ? 'Sauvegarde…' : 'Ajouter à cette idée'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.timelineHeader}>
                <View>
                  <Text style={styles.timelineEyebrow}>HISTORIQUE</Text>
                  <Text style={styles.timelineTitle}>Les traces retrouvées</Text>
                </View>
                <View style={styles.countPill}>
                  <Text style={styles.countText}>{notes.length}</Text>
                </View>
              </View>

              {notes.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Pas encore assez de traces</Text>
                  <Text style={styles.emptyText}>
                    Le sujet existe dans la mémoire, mais Daya n’a pas retrouvé de note détaillée à modifier.
                  </Text>
                </View>
              ) : (
                <View style={styles.notesList}>
                  {notes.map((note, index) => (
                    <View key={note.id} style={styles.noteRow}>
                      <View style={styles.timelineRail}>
                        <View style={styles.timelineDot} />
                        {index < notes.length - 1 ? <View style={styles.timelineLine} /> : null}
                      </View>

                      <View style={styles.noteCard}>
                        <View style={styles.noteTopRow}>
                          <Text style={styles.noteDate}>
                            {formatDate(note.created_at_iso) || 'Date inconnue'}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              setEditingId(note.id);
                              setEditingText(note.text);
                            }}
                          >
                            <Text style={styles.editLink}>Modifier</Text>
                          </TouchableOpacity>
                        </View>

                        {Boolean(note.title?.trim()) ? (
                          <Text style={styles.noteTitle}>{note.title}</Text>
                        ) : null}

                        {editingId === note.id ? (
                          <View style={styles.inlineEditBox}>
                            <TextInput
                              style={styles.inlineEditInput}
                              value={editingText}
                              onChangeText={setEditingText}
                              multiline
                              autoFocus
                            />
                            <View style={styles.inlineEditActions}>
                              <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                  setEditingId(null);
                                  setEditingText('');
                                }}
                              >
                                <Text style={styles.cancelButtonText}>Annuler</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.saveButton}
                                onPress={async () => {
                                  if (!editingText.trim()) return;
                                  setSavingEdit(true);
                                  const success = await updateNote(note.id, editingText);
                                  setSavingEdit(false);
                                  if (success) {
                                    setNotes((current) =>
                                      current.map((item) =>
                                        item.id === note.id
                                          ? { ...item, text: editingText.trim() }
                                          : item
                                      )
                                    );
                                    setEditingId(null);
                                    setEditingText('');
                                  }
                                }}
                                disabled={savingEdit}
                              >
                                <Text style={styles.saveButtonText}>
                                  {savingEdit ? 'Sauvegarde…' : 'Enregistrer'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <Text style={styles.noteText}>{note.text}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)' },
  backButtonText: { marginTop: -2, fontSize: 32, lineHeight: 34, color: '#334155' },
  headerText: { flex: 1, paddingHorizontal: 12 },
  headerEyebrow: { fontSize: 10, letterSpacing: 0.9, fontWeight: '900', textAlign: 'center', color: '#7C6FD0' },
  headerTitle: { marginTop: 3, fontSize: 17, fontWeight: '900', textAlign: 'center', color: '#1E293B' },
  headerSpacer: { width: 42 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 70 },
  summaryCard: { borderRadius: 24, padding: 20, backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 1, borderColor: '#E2E8F0' },
  kindPill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: '#EEF2FF' },
  kindPillText: { fontSize: 11, fontWeight: '900', color: '#5B5BD6' },
  summaryTitle: { marginTop: 16, fontSize: 21, fontWeight: '900', color: '#1E293B' },
  summaryText: { marginTop: 9, fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#56657A' },
  lastSeenText: { marginTop: 14, fontSize: 12, fontWeight: '800', color: '#94A3B8' },
  continueCard: { marginTop: 16, borderRadius: 24, padding: 18, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#DCE6FF' },
  continueEyebrow: { fontSize: 10, letterSpacing: 0.9, fontWeight: '900', color: '#6378B8' },
  continueTitle: { marginTop: 5, fontSize: 19, fontWeight: '900', color: '#1E293B' },
  continueHint: { marginTop: 7, fontSize: 14, lineHeight: 19, fontWeight: '600', color: '#64748B' },
  continueInput: { marginTop: 14, minHeight: 120, borderRadius: 18, borderWidth: 1, borderColor: '#DCE6F5', backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, lineHeight: 21, color: '#0F172A', textAlignVertical: 'top' },
  continueButton: { marginTop: 12, alignSelf: 'flex-end', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: '#3156D3' },
  disabledButton: { opacity: 0.45 },
  continueButtonText: { fontSize: 14, fontWeight: '900', color: '#FFFFFF' },
  timelineHeader: { marginTop: 24, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timelineEyebrow: { fontSize: 10, letterSpacing: 0.9, fontWeight: '900', color: '#94A3B8' },
  timelineTitle: { marginTop: 3, fontSize: 18, fontWeight: '900', color: '#1E293B' },
  countPill: { minWidth: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF' },
  countText: { fontSize: 13, fontWeight: '900', color: '#5B5BD6' },
  notesList: { gap: 0 },
  noteRow: { flexDirection: 'row' },
  timelineRail: { width: 24, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, marginTop: 22, borderRadius: 5, backgroundColor: '#7C6FD0' },
  timelineLine: { width: 2, flex: 1, minHeight: 40, backgroundColor: '#DDD8F8' },
  noteCard: { flex: 1, marginLeft: 8, marginBottom: 12, borderRadius: 20, padding: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  noteTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  noteDate: { fontSize: 11, fontWeight: '900', color: '#94A3B8' },
  editLink: { fontSize: 13, fontWeight: '900', color: '#3156D3' },
  noteTitle: { marginTop: 8, fontSize: 16, fontWeight: '900', color: '#1E293B' },
  noteText: { marginTop: 7, fontSize: 15, lineHeight: 21, fontWeight: '600', color: '#56657A' },
  inlineEditBox: { marginTop: 10 },
  inlineEditInput: { minHeight: 110, borderRadius: 16, borderWidth: 1, borderColor: '#DCE6F5', backgroundColor: '#F8FAFC', paddingHorizontal: 13, paddingVertical: 11, fontSize: 15, lineHeight: 21, color: '#0F172A', textAlignVertical: 'top' },
  inlineEditActions: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelButton: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#F1F5F9' },
  cancelButtonText: { fontSize: 13, fontWeight: '900', color: '#64748B' },
  saveButton: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#3156D3' },
  saveButtonText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  emptyCard: { borderRadius: 20, padding: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  emptyText: { marginTop: 7, fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#64748B' },
  errorCard: { borderRadius: 20, padding: 18, backgroundColor: '#FFF7F7', borderWidth: 1, borderColor: '#FECACA' },
  errorTitle: { fontSize: 16, fontWeight: '900', color: '#991B1B' },
  errorText: { marginTop: 7, fontSize: 14, lineHeight: 20, color: '#B91C1C' },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#F6F8FC' },
  loadingTitle: { marginTop: 16, fontSize: 18, fontWeight: '900', color: '#1E293B' },
  loadingText: { marginTop: 7, fontSize: 14, textAlign: 'center', color: '#64748B' },
});
