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
  onOpenConnection: (connection: MemoryConnection) => void;
  onOpenResumeItem: (item: LivingMemoryResumeItem) => void;
  onOpenMemory: () => void;
};

function getTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getKindLabel(kind: LivingMemoryResumeItem['kind']) {
  if (kind === 'project') {
    return 'Projet';
  }

  if (kind === 'loop') {
    return 'À reprendre';
  }

  return 'Objectif';
}

export function LivingMemoryHomeCard({
  accessToken,
  connection,
  onDismissConnection,
  onOpenConnection,
  onOpenResumeItem,
  onOpenMemory,
}: LivingMemoryHomeCardProps) {
  const [memory, setMemory] =
    useState<LivingMemoryProfile | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (!connection) {
      return;
    }

    const timeout = setTimeout(() => {
      void loadMemory();
    }, 1200);

    return () => clearTimeout(timeout);
  }, [connection, loadMemory]);

  const resumeItems = useMemo<LivingMemoryResumeItem[]>(() => {
    if (!memory) {
      return [];
    }

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
      // L'accueil reste volontairement léger : 3 sujets maximum.
      .slice(0, 3);
  }, [memory]);

  if (!connection && resumeItems.length === 0 && !loading) {
    return null;
  }

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
                CONNEXION TROUVÉE
              </Text>

              <Text style={styles.connectionTitle}>
                {connection.title || 'Cette idée a une histoire'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onDismissConnection}
              style={styles.closeButton}
              accessibilityLabel="Fermer la connexion mémoire"
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.connectionText}>
            {connection.explanation ||
              `Daya a retrouvé ${connection.relatedNotes.length} ancienne(s) note(s) liée(s) à ce que tu viens d'écrire.`}
          </Text>

          <TouchableOpacity
            onPress={() => onOpenConnection(connection)}
            style={styles.connectionAction}
          >
            <Text style={styles.connectionActionText}>
              Voir le fil de cette idée →
            </Text>
          </TouchableOpacity>
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

            <TouchableOpacity onPress={onOpenMemory}>
              <Text style={styles.seeAllText}>Tout voir</Text>
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
    marginTop: 16,
    gap: 12,
  },
  connectionCard: {
    borderRadius: 22,
    padding: 18,
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
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '900',
    color: '#6378B8',
  },
  connectionTitle: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 22,
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
  connectionText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    color: '#53627C',
  },
  connectionAction: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingVertical: 4,
  },
  connectionActionText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#3156D3',
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
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  resumeCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resumeEyebrow: {
    fontSize: 10,
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
  seeAllText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#5B5BD6',
  },
  resumeIntro: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: '#64748B',
  },
  resumeList: {
    marginTop: 12,
    gap: 9,
  },
  resumeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  kindPill: {
    minWidth: 64,
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
  },
  kindPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#5B5BD6',
  },
  resumeItemText: {
    flex: 1,
    marginLeft: 11,
  },
  resumeItemTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
  },
  resumeItemDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  chevron: {
    marginLeft: 8,
    fontSize: 24,
    color: '#94A3B8',
  },
});
