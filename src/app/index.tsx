import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingMemoryButton } from '../components/FloatingMemoryButton';
import { HeroCard } from '../components/HeroCard';
import { HomeMenu } from '../components/HomeMenu';
import type { LivingMemoryResumeItem } from '../components/LivingMemoryHomeCard';
import { LivingMemoryHomeCard } from '../components/LivingMemoryHomeCard';
import { MemoryAssistantSheet } from '../components/MemoryAssistantSheet';
import { NextReminderCard } from '../components/NextReminderCard';
import { QuickCaptureCard } from '../components/QuickCaptureCard';
import { RecentNotesPreview } from '../components/RecentNotesPreview';
import { useAuth } from '../context/AuthContext';
import { useNotes } from '../context/NotesContext';
import {
  listenForPushTokenChanges,
  registerPushTokenForUser,
} from '../services/pushTokenService';
import type { MemoryConnection } from '../services/relatedNotesService';
import {
  saveMemoryConnectionFeedback,
} from '../services/relatedNotesService';

export default function HomeScreen() {
  const {
    user,
    profile,
    session,
    loading,
    refreshProfile,
  } = useAuth();
  const [memoryOpen, setMemoryOpen] = useState(false);

  const {
    note,
    setNote,
    addNote,
    saving,
    scheduledReminders,
    pendingNotes,
    lastMemoryConnection,
    dismissMemoryConnection,
  } = useNotes();

  const hasSavedContent =
    pendingNotes.length > 0 ||
    scheduledReminders.length > 0;

  /**
   * Redirige l’utilisateur vers la connexion uniquement
   * lorsque la restauration de session est terminée.
   */
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user]);

 useEffect(() => {
  if (!user?.id) {
    return;
  }

  const userId = user.id;

  let lastPushSyncAt = 0;
  let syncRunning = false;

  async function syncPushToken(force = false) {
    if (syncRunning) {
      return;
    }

    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (
      !force &&
      now - lastPushSyncAt < fiveMinutes
    ) {
      return;
    }

    syncRunning = true;

    try {
      const result =
        await registerPushTokenForUser(userId);

      if (result.success) {
        lastPushSyncAt = Date.now();

        console.log(
          '✅ Push Daya synchronisé.'
        );
      } else {
        console.warn(
          "Le push Daya n'a pas pu être synchronisé :",
          result.error
        );
      }
    } finally {
      syncRunning = false;
    }
  }

  /**
   * Vérifie le token dès que la session
   * utilisateur est disponible.
   */
  void syncPushToken(true);

  /**
   * Si Expo change le token pendant que
   * l'application fonctionne, on le
   * resynchronise automatiquement.
   */
  const pushTokenSubscription =
    listenForPushTokenChanges(userId);

  /**
   * Quand Daya revient au premier plan,
   * on recharge le profil et on vérifie
   * de nouveau le token push.
   */
  const appStateSubscription =
    AppState.addEventListener(
      'change',
      (state) => {
        if (state !== 'active') {
          return;
        }

        void refreshProfile();
        void syncPushToken();
      }
    );

  return () => {
    pushTokenSubscription?.remove();
    appStateSubscription.remove();
  };
}, [
  user?.id,
  refreshProfile,
]);


  /**
   * On n’affiche plus null pendant le chargement.
   * Cela évite l’écran noir après la connexion ou au redémarrage.
   */
  if (loading) {
    return <LoadingScreen message="Chargement de Daya..." />;
  }

  /**
   * Pendant que router.replace() redirige vers /login,
   * on garde un écran visible au lieu d’un écran noir.
   */
  if (!user) {
    return <LoadingScreen message="Ouverture de la connexion..." />;
  }

  return (
  <View style={styles.screen}>
    <Image
      source={require('../../assets/images/background.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    />

    <View style={styles.backgroundOverlay} />

    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <HomeMenu
  onOpenNotes={() => router.push('/notes')}
  onOpenReminders={() => router.push('/reminders')}
  onOpenMemory={() => router.push('/memory')}
  onOpenArchives={() => router.push('/archives')}
  onOpenSettings={() => router.push('/settings')}
/>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <HeroCard
          userName={
            profile?.first_name ||
            user.email?.split('@')[0] ||
            'Utilisateur'
          }
        />

        <QuickCaptureCard
          note={note}
          setNote={setNote}
          onAddNote={addNote}
          loading={saving}
        />

        <LivingMemoryHomeCard
          accessToken={session?.access_token}
          connection={lastMemoryConnection}
          onDismissConnection={dismissMemoryConnection}
          onConfirmConnection={async (connection: MemoryConnection) => {
            const accessToken = session?.access_token;

            if (!accessToken || !connection.sourceNoteId) {
              console.warn(
                'Connexion mémoire impossible à valider : session ou note source manquante.'
              );
              return;
            }

            const relatedNoteIds = connection.relatedNotes.map(
              (item) => item.id
            );

            const result = await saveMemoryConnectionFeedback({
              accessToken,
              sourceNoteId: connection.sourceNoteId,
              relatedNoteIds,
              status: 'confirmed',
            });

            if (!result.success) {
              console.warn(
                'La connexion mémoire n’a pas pu être validée :',
                result.error
              );
              return;
            }

            dismissMemoryConnection();

            router.push({
              pathname: '/memory-topic',
              params: {
                source: 'connection',
                title:
                  connection.title ||
                  'Cette idée a une histoire',
                description:
                  connection.explanation || '',
                noteIds: [
                  connection.sourceNoteId,
                  ...relatedNoteIds,
                ].join(','),
              },
            } as never);
          }}
          onRejectConnection={async (connection: MemoryConnection) => {
            const accessToken = session?.access_token;

            if (!accessToken || !connection.sourceNoteId) {
              dismissMemoryConnection();
              return;
            }

            const result = await saveMemoryConnectionFeedback({
              accessToken,
              sourceNoteId: connection.sourceNoteId,
              relatedNoteIds: connection.relatedNotes.map(
                (item) => item.id
              ),
              status: 'rejected',
            });

            if (!result.success) {
              console.warn(
                'Le rejet de la connexion mémoire n’a pas pu être enregistré :',
                result.error
              );
              return;
            }

            dismissMemoryConnection();
          }}
          onOpenResumeItem={(item: LivingMemoryResumeItem) => {
            router.push({
              pathname: '/memory-topic',
              params: {
                source: 'memory',
                kind: item.kind,
                label: item.label,
              },
            } as never);
          }}
          onSeeConnections={() => {
            router.push('/memory-connections');
          }}
        />

        {!hasSavedContent ? (
          <View style={styles.emptyGuideCard}>
            <Text style={styles.emptyGuideEmoji}>
              💡
            </Text>

            <Text style={styles.emptyGuideTitle}>
              Commencez simplement
            </Text>

            <Text style={styles.emptyGuideText}>
              Notez une idée pour ne plus l’oublier, ou écrivez
              un rappel avec une heure précise.
            </Text>

            <View style={styles.emptyGuideExample}>
              <Text style={styles.emptyGuideExampleLabel}>
                Exemple
              </Text>

              <Text style={styles.emptyGuideExampleText}>
                « Rappelle-moi d’appeler Rachel demain à 18 h »
              </Text>
            </View>
          </View>
        ) : null}

        <RecentNotesPreview
          notes={pendingNotes
            .filter((item) => item.type === 'note')
            .slice(0, 3)}
          onSeeAll={() => router.push('/notes')}
        />

        <NextReminderCard
          reminders={scheduledReminders}
          onSeeAll={() => router.push('/reminders')}
        />
      </ScrollView>

      <FloatingMemoryButton
        onPress={() => setMemoryOpen(true)}
      />

      <MemoryAssistantSheet
        visible={memoryOpen}
        onClose={() => setMemoryOpen(false)}
      />
    </SafeAreaView>
  </View>
);
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingTitle}>Daya</Text>

        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({

  screen: {
  flex: 1,
  width: '100%',
  overflow: 'hidden',
  backgroundColor: '#F6F8FC',
},

backgroundImage: {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: '100%',
  height: '100%',
},

backgroundOverlay: {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  backgroundColor: 'rgba(246, 248, 252, 0.82)',
},

container: {
  flex: 1,
  width: '100%',
  backgroundColor: 'transparent',
},

scrollView: {
  flex: 1,
  width: '100%',
},

content: {
  width: '100%',
  paddingHorizontal: 22,
  paddingTop: 90,
  paddingBottom: 150,
},

  emptyGuideCard: {
    marginTop: 0,
    marginBottom: 16,
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
  },

  emptyGuideEmoji: {
    fontSize: 28,
  },

  emptyGuideTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },

  emptyGuideText: {
    marginTop: 8,
    maxWidth: 310,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontWeight: '600',
    color: '#64748B',
  },

  emptyGuideExample: {
    width: '100%',
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
  },

  emptyGuideExampleLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#94A3B8',
  },

  emptyGuideExampleText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: '#334155',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F6F8FC',
  },

  loadingCard: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
  },

  loadingTitle: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },

  loadingText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    color: '#64748B',
  },
});