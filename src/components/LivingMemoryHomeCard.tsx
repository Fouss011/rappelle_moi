import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type {
  LivingMemoryItem,
  LivingMemoryProfile,
} from '../services/livingMemoryService';
import {
  getLivingMemory,
  refreshLivingMemory,
} from '../services/livingMemoryService';
import type {
  MemoryConnection,
} from '../services/relatedNotesService';

export type LivingMemoryResumeItem = LivingMemoryItem & {
  kind: 'project' | 'loop' | 'goal';
};

type LivingMemoryHomeCardProps = {
  accessToken?: string;
  connection: MemoryConnection | null;
  onDismissConnection: () => void;
  onConfirmConnection: (
    connection: MemoryConnection
  ) => Promise<void>;
  onRejectConnection: (
    connection: MemoryConnection
  ) => Promise<void>;
  onOpenResumeItem: (item: LivingMemoryResumeItem) => void;
  onSeeConnections: () => void;
};

function getTimestamp(value?: string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getKindLabel(kind: LivingMemoryResumeItem['kind']) {
  if (kind === 'project') return 'Projet';
  if (kind === 'loop') return 'À reprendre';
  return 'Objectif';
}

function cleanSuggestionTitle(connection: MemoryConnection) {
  const firstRelatedTitle =
    connection.relatedNotes[0]?.title?.trim();

  if (firstRelatedTitle) {
    return firstRelatedTitle;
  }

  if (connection.title?.trim()) {
    return connection.title.trim();
  }

  return 'une ancienne idée';
}

export function LivingMemoryHomeCard({
  accessToken,
  connection,
  onDismissConnection,
  onConfirmConnection,
  onRejectConnection,
  onOpenResumeItem,
  onSeeConnections,
}: LivingMemoryHomeCardProps) {
  const [memory, setMemory] =
    useState<LivingMemoryProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] =
    useState<'yes' | 'no' | null>(null);

  const loadMemory = useCallback(async () => {
    if (!accessToken) {
      setMemory(null);
      return;
    }

    setLoading(true);

    try {
      const result = await getLivingMemory(accessToken);

      if (result.success && result.memory) {
        setMemory(result.memory);
        return;
      }

      const refreshResult =
        await refreshLivingMemory(accessToken);

      if (refreshResult.success) {
        setMemory(refreshResult.memory ?? null);
      }
    } catch (error) {
      console.warn(
        "Impossible de charger l'aperçu de mémoire :",
        error
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadMemory();
  }, [loadMemory]);

  useEffect(() => {
    if (!connection) return;

    const timeout = setTimeout(() => {
      void loadMemory();
    }, 1200);

    return () => clearTimeout(timeout);
  }, [connection, loadMemory]);

  const resumeItems = useMemo<LivingMemoryResumeItem[]>(() => {
    if (!memory) return [];

    const projects = (memory.active_projects ?? []).map(
      (item) => ({ ...item, kind: 'project' as const })
    );
    const loops = (memory.open_loops ?? []).map(
      (item) => ({ ...item, kind: 'loop' as const })
    );
    const goals = (memory.goals ?? []).map(
      (item) => ({ ...item, kind: 'goal' as const })
    );

    return [...projects, ...loops, ...goals]
      .sort((a, b) => {
        const dateDifference =
          getTimestamp(b.lastSeenAt) -
          getTimestamp(a.lastSeenAt);

        if (dateDifference !== 0) {
          return dateDifference;
        }

        return (b.confidence ?? 0) - (a.confidence ?? 0);
      })
      .slice(0, 3);
  }, [memory]);

  if (!connection && resumeItems.length === 0 && !loading) {
    return null;
  }

  const suggestedTitle = connection
    ? cleanSuggestionTitle(connection)
    : '';

  return (
    <View style={styles.wrapper}>
      {connection ? (
        <View style={styles.connectionCard}>
          <View style={styles.connectionHeader}>
            <View style={styles.connectionIcon}>
              <Text style={styles.connectionIconText}>↗</Text>
            </View>

            <View style={styles.connectionHeaderText}>
              <Text style={styles.connectionEyebrow}>
                CONNEXION PROPOSÉE
              </Text>

              <Text style={styles.connectionTitle}>
                Daya a retrouvé un fil possible
              </Text>
            </View>

            <TouchableOpacity
              onPress={onDismissConnection}
              style={styles.closeButton}
              accessibilityLabel="Décider plus tard"
              disabled={feedbackLoading !== null}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.connectionQuestion}>
            Cette idée semble poursuivre « {suggestedTitle} ».
            Est-ce bien la suite ?
          </Text>

          {Boolean(connection.explanation?.trim()) ? (
            <Text style={styles.connectionText}>
              {connection.explanation}
            </Text>
          ) : null}

          <View style={styles.feedbackRow}>
            <TouchableOpacity
              style={[
                styles.yesButton,
                feedbackLoading !== null && styles.disabledButton,
              ]}
              onPress={async () => {
                setFeedbackLoading('yes');
                try {
                  await onConfirmConnection(connection);
                } finally {
                  setFeedbackLoading(null);
                }
              }}
              disabled={feedbackLoading !== null}
            >
              <Text style={styles.yesButtonText}>
                {feedbackLoading === 'yes'
                  ? 'Validation…'
                  : 'Oui, c’est la suite'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.noButton,
                feedbackLoading !== null && styles.disabledButton,
              ]}
              onPress={async () => {
                setFeedbackLoading('no');
                try {
                  await onRejectConnection(connection);
                } finally {
                  setFeedbackLoading(null);
                }
              }}
              disabled={feedbackLoading !== null}
            >
              <Text style={styles.noButtonText}>
                {feedbackLoading === 'no'
                  ? 'Enregistrement…'
                  : 'Non, sujet différent'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.laterHint}>
            × ferme simplement la proposition pour décider plus tard.
          </Text>
        </View>
      ) : null}

      {loading && resumeItems.length === 0 ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>
            Daya retrouve ce que tu avais commencé…
          </Text>
        </View>
      ) : null}

      {resumeItems.length > 0 ? (
        <View style={styles.resumeCard}>
          <View style={styles.resumeHeader}>
            <View>
              <Text style={styles.resumeEyebrow}>
                MÉMOIRE VIVANTE
              </Text>
              <Text style={styles.resumeTitle}>
                À reprendre
              </Text>
            </View>

            <TouchableOpacity
              onPress={onSeeConnections}
              activeOpacity={0.75}
              accessibilityLabel="Voir toutes les connexions mémoire"
            >
              <Text style={styles.resumeLink}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.resumeIntro}>
            Voici ce que tu avais déjà lancé ou laissé ouvert.
          </Text>

          <View style={styles.resumeList}>
            {resumeItems.map((item, index) => (
              <TouchableOpacity
                key={`${item.kind}-${item.label}-${index}`}
                style={styles.resumeItem}
                onPress={() => onOpenResumeItem(item)}
                activeOpacity={0.8}
              >
                <View style={styles.kindPill}>
                  <Text style={styles.kindPillText}>
                    {getKindLabel(item.kind)}
                  </Text>
                </View>

                <View style={styles.resumeItemText}>
                  <Text
                    style={styles.resumeItemTitle}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>

                  {Boolean(item.description?.trim()) ? (
                    <Text
                      style={styles.resumeItemDescription}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 16,
    gap: 16,
  },
  connectionCard: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: '#F4F7FF',
    borderWidth: 1,
    borderColor: '#DDE6FF',
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  connectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E4EBFF',
  },
  connectionIconText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#3156D3',
  },
  connectionHeaderText: {
    flex: 1,
    paddingHorizontal: 12,
  },
  connectionEyebrow: {
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '900',
    color: '#6378B8',
  },
  connectionTitle: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
    color: '#1E293B',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  closeButtonText: {
    fontSize: 20,
    lineHeight: 22,
    color: '#64748B',
  },
  connectionQuestion: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    color: '#334155',
  },
  connectionText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: '#53627C',
  },
  feedbackRow: {
    marginTop: 16,
    gap: 9,
  },
  yesButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#3156D3',
  },
  yesButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  noButton: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E2F2',
  },
  noButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#475569',
  },
  disabledButton: {
    opacity: 0.55,
  },
  laterHint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: '#7C8AA0',
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#5F6F85',
  },
  resumeCard: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resumeLink: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563EB',
  },
  resumeEyebrow: {
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '900',
    color: '#8B5CF6',
  },
  resumeTitle: {
    marginTop: 3,
    fontSize: 19,
    fontWeight: '900',
    color: '#1E293B',
  },
  resumeIntro: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#5F6F85',
  },
  resumeList: {
    marginTop: 12,
    gap: 9,
  },
  resumeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    minHeight: 82,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
  },
  kindPill: {
    width: 96,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
  },
  kindPillText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    color: '#5B5BD6',
  },
  resumeItemText: {
    flex: 1,
    marginLeft: 12,
  },
  resumeItemTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    color: '#1E293B',
  },
  resumeItemDescription: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#5F6F85',
  },
  chevron: {
    marginLeft: 8,
    fontSize: 24,
    color: '#94A3B8',
  },
});
