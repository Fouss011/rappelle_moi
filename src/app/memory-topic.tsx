import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../components/AppBackground';
import { useAuth } from '../context/AuthContext';
import {
    getLivingMemory,
    type LivingMemoryItem,
    type LivingMemoryProfile,
} from '../services/livingMemoryService';
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

function getMemoryCollection(
  memory: LivingMemoryProfile,
  kind: TopicKind
) {
  if (kind === 'project') {
    return memory.active_projects ?? [];
  }

  if (kind === 'loop') {
    return memory.open_loops ?? [];
  }

  return memory.goals ?? [];
}

function getKindLabel(kind?: TopicKind) {
  if (kind === 'project') {
    return 'Projet';
  }

  if (kind === 'loop') {
    return 'À reprendre';
  }

  if (kind === 'goal') {
    return 'Objectif';
  }

  return 'Connexion mémoire';
}

function formatDate(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

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

  const [topic, setTopic] = useState<TopicState | null>(null);
  const [notes, setNotes] = useState<TopicNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const source = firstParam(params.source);
  const kindParam = firstParam(params.kind) as TopicKind | undefined;
  const labelParam = firstParam(params.label)?.trim() ?? '';
  const titleParam = firstParam(params.title)?.trim() ?? '';
  const descriptionParam =
    firstParam(params.description)?.trim() ?? '';
  const noteIdsParam = firstParam(params.noteIds) ?? '';

  const connectionNoteIds = useMemo(
    () =>
      noteIdsParam
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
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
      let resolvedTopic: TopicState | null = null;

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
          throw new Error(
            result.error ||
              'Impossible de retrouver ce sujet dans la mémoire.'
          );
        }

        const collection = getMemoryCollection(
          result.memory,
          kindParam ?? 'project'
        );

        const normalizedLabel = labelParam.toLowerCase();

        const item: LivingMemoryItem | undefined =
          collection.find(
            (candidate) =>
              candidate.label.trim().toLowerCase() ===
              normalizedLabel
          );

        if (!item) {
          throw new Error(
            'Ce sujet a évolué ou n’est plus présent dans la mémoire actuelle.'
          );
        }

        resolvedTopic = {
          title: item.label,
          description: item.description,
          kindLabel: getKindLabel(kindParam),
          lastSeenAt: item.lastSeenAt,
          evidenceNoteIds: item.evidenceNoteIds ?? [],
        };
      }

      setTopic(resolvedTopic);

      if (resolvedTopic.evidenceNoteIds.length === 0) {
        setNotes([]);
        return;
      }

      const { data, error } = await supabase
        .from('notes')
        .select(
          'id, title, text, created_at_iso, type, category, is_done'
        )
        .eq('user_id', user.id)
        .in('id', resolvedTopic.evidenceNoteIds);

      if (error) {
        throw new Error(error.message);
      }

      const order = new Map(
        resolvedTopic.evidenceNoteIds.map((id, index) => [id, index])
      );

      const sortedNotes = [...(data ?? [])].sort((a, b) => {
        const aDate = new Date(a.created_at_iso ?? 0).getTime();
        const bDate = new Date(b.created_at_iso ?? 0).getTime();

        if (aDate !== bDate) {
          return bDate - aDate;
        }

        return (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999);
      });

      setNotes(sortedNotes as TopicNote[]);
    } catch (error) {
      console.error('Erreur fiche mémoire :', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de charger ce souvenir.'
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
    if (authLoading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    void loadTopic();
  }, [authLoading, loadTopic, user]);

  if (authLoading || loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingTitle}>
          Daya rassemble tes souvenirs…
        </Text>
        <Text style={styles.loadingText}>
          On reconstitue le fil de ce sujet.
        </Text>
      </View>
    );
  }

  return (
    <AppBackground>
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'left', 'right']}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerEyebrow}>
              FIL DE MÉMOIRE
            </Text>
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
        >
          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>
                Daya n’a pas retrouvé ce fil
              </Text>
              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {topic ? (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.kindPill}>
                  <Text style={styles.kindPillText}>
                    {topic.kindLabel}
                  </Text>
                </View>

                <Text style={styles.summaryTitle}>
                  Ce que Daya retient
                </Text>

                <Text style={styles.summaryText}>
                  {topic.description ||
                    'Daya a retrouvé plusieurs notes qui appartiennent au même fil. Elles sont regroupées ci-dessous pour te permettre de reprendre le contexte.'}
                </Text>

                {topic.lastSeenAt ? (
                  <Text style={styles.lastSeenText}>
                    Dernière trace : {formatDate(topic.lastSeenAt)}
                  </Text>
                ) : null}
              </View>

              <View style={styles.timelineHeader}>
                <View>
                  <Text style={styles.timelineEyebrow}>
                    HISTORIQUE
                  </Text>
                  <Text style={styles.timelineTitle}>
                    Les traces retrouvées
                  </Text>
                </View>

                <View style={styles.countPill}>
                  <Text style={styles.countText}>{notes.length}</Text>
                </View>
              </View>

              {notes.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>
                    Pas encore assez de traces
                  </Text>
                  <Text style={styles.emptyText}>
                    Le sujet existe dans la mémoire, mais Daya n’a pas
                    retrouvé de note détaillée à afficher ici.
                  </Text>
                </View>
              ) : (
                <View style={styles.notesList}>
                  {notes.map((note, index) => (
                    <View key={note.id} style={styles.noteRow}>
                      <View style={styles.timelineRail}>
                        <View style={styles.timelineDot} />
                        {index < notes.length - 1 ? (
                          <View style={styles.timelineLine} />
                        ) : null}
                      </View>

                      <View style={styles.noteCard}>
                        <Text style={styles.noteDate}>
                          {formatDate(note.created_at_iso) || 'Date inconnue'}
                        </Text>

                        {Boolean(note.title?.trim()) ? (
                          <Text style={styles.noteTitle}>
                            {note.title}
                          </Text>
                        ) : null}

                        <Text style={styles.noteText}>
                          {note.text}
                        </Text>
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
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  backButtonText: {
    marginTop: -2,
    fontSize: 32,
    lineHeight: 34,
    color: '#334155',
  },
  headerText: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerEyebrow: {
    fontSize: 9,
    letterSpacing: 0.9,
    fontWeight: '900',
    textAlign: 'center',
    color: '#7C6FD0',
  },
  headerTitle: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    color: '#1E293B',
  },
  headerSpacer: {
    width: 42,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 70,
  },
  summaryCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kindPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
  },
  kindPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#5B5BD6',
  },
  summaryTitle: {
    marginTop: 16,
    fontSize: 21,
    fontWeight: '900',
    color: '#1E293B',
  },
  summaryText: {
    marginTop: 9,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    color: '#56657A',
  },
  lastSeenText: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  timelineHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineEyebrow: {
    fontSize: 9,
    letterSpacing: 0.9,
    fontWeight: '900',
    color: '#94A3B8',
  },
  timelineTitle: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  countPill: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  countText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#5B5BD6',
  },
  notesList: {
    gap: 0,
  },
  noteRow: {
    flexDirection: 'row',
  },
  timelineRail: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    marginTop: 19,
    borderRadius: 5,
    backgroundColor: '#7C6FD0',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
    backgroundColor: '#E2E8F0',
  },
  noteCard: {
    flex: 1,
    marginLeft: 8,
    marginBottom: 12,
    borderRadius: 18,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: '#E8EDF4',
  },
  noteDate: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
  },
  noteTitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '900',
    color: '#334155',
  },
  noteText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    color: '#56657A',
  },
  errorCard: {
    marginBottom: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#9A3412',
  },
  errorText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: '#9A3412',
  },
  emptyCard: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#334155',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F6F8FC',
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  loadingText: {
    marginTop: 7,
    fontSize: 13,
    textAlign: 'center',
    color: '#64748B',
  },
});
