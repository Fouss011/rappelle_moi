import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
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
  LivingMemoryItem,
  LivingMemoryProfile,
  refreshLivingMemory,
} from '../services/livingMemoryService';

type MemorySectionProps = {
  emoji: string;
  title: string;
  emptyText: string;
  items: LivingMemoryItem[];
};

function MemorySection({
  emoji,
  title,
  emptyText,
  items,
}: MemorySectionProps) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>

        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {items.length === 0 ? (
        <Text style={styles.emptySectionText}>{emptyText}</Text>
      ) : (
        <View style={styles.itemsList}>
          {items.map((item, index) => (
            <MemoryItemCard
              key={`${title}-${item.label}-${index}`}
              item={item}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function MemoryItemCard({
  item,
}: {
  item: LivingMemoryItem;
}) {
  const confidence = Number.isFinite(item.confidence)
    ? Math.round(item.confidence * 100)
    : null;

  return (
    <View style={styles.memoryItem}>
      <View style={styles.itemTopRow}>
        <Text style={styles.itemLabel}>{item.label}</Text>

        {confidence !== null && (
          <View style={styles.confidencePill}>
            <Text style={styles.confidenceText}>
              {confidence} %
            </Text>
          </View>
        )}
      </View>

      {Boolean(item.description?.trim()) && (
        <Text style={styles.itemDescription}>
          {item.description}
        </Text>
      )}

      {Boolean(item.lastSeenAt) && (
        <Text style={styles.lastSeenText}>
          Dernière trace : {formatMemoryDate(item.lastSeenAt)}
        </Text>
      )}
    </View>
  );
}

function formatMemoryDate(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function MemoryScreen() {
  const { user, session, loading } = useAuth();

  const [memory, setMemory] =
    useState<LivingMemoryProfile | null>(null);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [generating, setGenerating] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const accessToken = session?.access_token;

  const loadMemory = useCallback(async () => {
  if (!accessToken) {
    setInitialLoading(false);
    return;
  }

  setErrorMessage('');

  try {
    /**
     * À chaque ouverture de la page, le backend vérifie
     * si une nouvelle note existe.
     *
     * Sans nouvelle note :
     * il retourne directement le profil existant.
     *
     * Avec une nouvelle note :
     * il reconstruit automatiquement la mémoire.
     */
    const result =
      await refreshLivingMemory(accessToken);

    if (!result.success) {
      /**
       * Si l'actualisation rencontre un problème,
       * on essaie au moins d'afficher la dernière
       * mémoire déjà enregistrée.
       */
      const fallbackResult =
        await getLivingMemory(accessToken);

      if (fallbackResult.success) {
        setMemory(
          fallbackResult.memory ?? null
        );
      }

      setErrorMessage(
        result.error ||
          'Impossible d’actualiser la mémoire vivante.'
      );

      return;
    }

    setMemory(result.memory ?? null);
  } catch (error) {
    console.error(
      'Erreur pendant le chargement automatique de la mémoire :',
      error
    );

    setErrorMessage(
      'Impossible de contacter le serveur.'
    );
  } finally {
    setInitialLoading(false);
  }
}, [accessToken]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    void loadMemory();
  }, [loadMemory, loading, user]);

  const handleRefreshScreen = useCallback(async () => {
    if (!accessToken || refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await loadMemory();
    } finally {
      setRefreshing(false);
    }
  }, [accessToken, loadMemory, refreshing]);

  const handleGenerateMemory = useCallback(async () => {
    if (!accessToken || generating) {
      return;
    }

    setGenerating(true);
    setErrorMessage('');

    try {
      const result =
        await refreshLivingMemory(accessToken);

      if (!result.success) {
        setErrorMessage(
          result.error ||
            "Impossible d'actualiser la mémoire vivante."
        );

        return;
      }

      setMemory(result.memory ?? null);
    } catch (error) {
      console.error(
        'Erreur pendant la génération de la mémoire :',
        error
      );

      setErrorMessage(
        "Une erreur inattendue s'est produite."
      );
    } finally {
      setGenerating(false);
    }
  }, [accessToken, generating]);

  if (loading || initialLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingTitle}>
          Daya réfléchit…
        </Text>

        <Text style={styles.loadingText}>
          Chargement de ta mémoire vivante.
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" />
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

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>
            Mémoire vivante
          </Text>

          <Text style={styles.headerSubtitle}>
            Ce que Daya comprend de toi
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefreshScreen}
          />
        }
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🧠</Text>

          <Text style={styles.heroTitle}>
            Ta mémoire évolue avec toi
          </Text>

          <Text style={styles.heroText}>
            Daya analyse uniquement les informations
            présentes dans tes notes pour repérer tes
            projets, tes objectifs et les sujets qui
            reviennent souvent.
          </Text>

          <TouchableOpacity
            style={[
              styles.generateButton,
              generating && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerateMemory}
            disabled={generating}
          >
            {generating ? (
              <View style={styles.generateLoadingRow}>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text style={styles.generateButtonText}>
                  Analyse en cours…
                </Text>
              </View>
            ) : (
              <Text style={styles.generateButtonText}>
                Actualiser ma mémoire
              </Text>
            )}
          </TouchableOpacity>

          {memory?.last_analysis_at && (
            <Text style={styles.analysisDateText}>
              Dernière analyse :{' '}
              {formatMemoryDate(memory.last_analysis_at)}
            </Text>
          )}
        </View>

        {Boolean(errorMessage) && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Impossible de continuer
            </Text>

            <Text style={styles.errorText}>
              {errorMessage}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleGenerateMemory}
            >
              <Text style={styles.retryButtonText}>
                Réessayer
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!memory ? (
          <View style={styles.emptyMemoryCard}>
            <Text style={styles.emptyMemoryEmoji}>
              🌱
            </Text>

            <Text style={styles.emptyMemoryTitle}>
              Ta mémoire n’a pas encore été créée
            </Text>

            <Text style={styles.emptyMemoryText}>
              Ajoute quelques notes puis appuie sur
              « Actualiser ma mémoire ». Daya commencera
              progressivement à identifier les éléments
              importants.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                TON PROFIL ACTUEL
              </Text>

              <Text style={styles.summaryTitle}>
                Ce que Daya comprend
              </Text>

              <Text style={styles.summaryText}>
                {memory.personal_summary?.trim() ||
                  "Daya n'a pas encore assez d'informations pour produire un résumé fiable."}
              </Text>
            </View>

            <MemorySection
              emoji="🚀"
              title="Projets actifs"
              emptyText="Aucun projet clairement identifié pour le moment."
              items={memory.active_projects ?? []}
            />

            <MemorySection
              emoji="🎯"
              title="Objectifs"
              emptyText="Aucun objectif suffisamment clair pour le moment."
              items={memory.goals ?? []}
            />

            <MemorySection
              emoji="👥"
              title="Personnes importantes"
              emptyText="Aucune personne ne revient encore assez souvent."
              items={memory.important_people ?? []}
            />

            <MemorySection
              emoji="🔁"
              title="Sujets récurrents"
              emptyText="Aucun sujet récurrent identifié pour le moment."
              items={memory.recurring_topics ?? []}
            />

            <MemorySection
              emoji="❤️"
              title="Préférences"
              emptyText="Daya n’a pas encore appris tes préférences."
              items={memory.preferences ?? []}
            />

            <MemorySection
              emoji="⏳"
              title="Éléments en attente"
              emptyText="Aucun élément en attente identifié."
              items={memory.open_loops ?? []}
            />

            <View style={styles.privacyCard}>
              <Text style={styles.privacyTitle}>
                🔐 Daya reste prudent
              </Text>

              <Text style={styles.privacyText}>
                Ces éléments sont des observations basées
                sur tes propres notes. Daya ne doit jamais
                inventer une relation, un projet ou une
                préférence sans information suffisante.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F6F8FC',
  },

  loadingTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E7ECF3',
    backgroundColor: '#FFFFFF',
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },

  backButtonText: {
    marginTop: -3,
    fontSize: 34,
    lineHeight: 36,
    color: '#0F172A',
    fontWeight: '500',
  },

  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  headerSpacer: {
    width: 42,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 70,
  },

  heroCard: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 26,
    borderRadius: 28,
    backgroundColor: '#172554',
  },

  heroEmoji: {
    fontSize: 38,
  },

  heroTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  heroText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: '#DCE7FF',
    fontWeight: '600',
    textAlign: 'center',
  },

  generateButton: {
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#2563EB',
  },

  generateButtonDisabled: {
    opacity: 0.75,
  },

  generateLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  generateButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  analysisDateText: {
    marginTop: 12,
    fontSize: 11,
    color: '#BFDBFE',
    fontWeight: '700',
  },

  errorCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },

  errorTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#B91C1C',
  },

  errorText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#991B1B',
    fontWeight: '600',
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },

  retryButtonText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '900',
  },

  emptyMemoryCard: {
    marginTop: 16,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },

  emptyMemoryEmoji: {
    fontSize: 36,
  },

  emptyMemoryTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  emptyMemoryText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },

  summaryCard: {
    marginTop: 16,
    padding: 20,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
  },

  summaryLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: '#2563EB',
    fontWeight: '900',
  },

  summaryTitle: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '900',
    color: '#172554',
  },

  summaryText: {
    marginTop: 9,
    fontSize: 15,
    lineHeight: 23,
    color: '#334155',
    fontWeight: '600',
  },

  sectionCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    backgroundColor: '#FFFFFF',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sectionEmoji: {
    fontSize: 22,
    marginRight: 9,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptySectionText: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    color: '#94A3B8',
    fontWeight: '600',
  },

  itemsList: {
    marginTop: 14,
    gap: 10,
  },

  memoryItem: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },

  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  itemLabel: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '900',
  },

  confidencePill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#E0E7FF',
  },

  confidenceText: {
    fontSize: 10,
    color: '#4338CA',
    fontWeight: '900',
  },

  itemDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    fontWeight: '600',
  },

  lastSeenText: {
    marginTop: 8,
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
  },

  privacyCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  privacyTitle: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '900',
  },

  privacyText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
    fontWeight: '600',
  },
});