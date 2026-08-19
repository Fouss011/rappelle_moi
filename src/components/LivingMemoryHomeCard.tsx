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

type LivingMemoryHomeCardProps = {
  accessToken?: string;
  connection: MemoryConnection | null;
  onDismissConnection: () => void;
  onOpenMemory: () => void;
};

type ResumeItem = LivingMemoryItem & {
  kind: 'project' | 'loop' | 'goal';
};

function getTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getKindLabel(kind: ResumeItem['kind']) {
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

      // Première utilisation : on construit le profil uniquement
      // s'il n'existe pas encore. Les ouvertures suivantes restent légères.
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

  // Quand une nouvelle connexion est trouvée, NotesContext a aussi
  // demandé une actualisation de la mémoire. On recharge ensuite
  // l'aperçu afin que le projet ou la boucle puisse remonter sur l'accueil.
  useEffect(() => {
    if (!connection) {
      return;
    }

    const timeout = setTimeout(() => {
      void loadMemory();
    }, 1200);

    return () => clearTimeout(timeout);
  }, [connection, loadMemory]);

  const resumeItems = useMemo<ResumeItem[]>(() => {
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
            onPress={onOpenMemory}
            style={styles.connectionAction}
          >
            <Text style={styles.connectionActionText}>
              Voir dans ma mémoire →
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
                onPress={onOpenMemory}
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
  },

  connectionCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#D7E4FF',
  },

  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  connectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#172554',
  },

  connectionIconText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  connectionHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  connectionEyebrow: {
    fontSize: 10,
    letterSpacing: 0.9,
    fontWeight: '900',
    color: '#2563EB',
  },

  connectionTitle: {
    marginTop: 3,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    color: '#172554',
  },

  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    fontSize: 24,
    color: '#64748B',
  },

  connectionText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    color: '#475569',
  },

  connectionAction: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },

  connectionActionText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2563EB',
  },

  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  loadingText: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  resumeCard: {
    marginTop: 12,
    borderRadius: 24,
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
    letterSpacing: 0.9,
    fontWeight: '900',
    color: '#64748B',
  },

  resumeTitle: {
    marginTop: 3,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  seeAllText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2563EB',
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
  },

  resumeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },

  kindPill: {
    minWidth: 67,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },

  kindPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#475569',
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
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: '#64748B',
  },

  chevron: {
    marginLeft: 8,
    fontSize: 24,
    color: '#94A3B8',
  },
});
