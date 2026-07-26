import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingMemoryButton } from '../components/FloatingMemoryButton';
import { HeroCard } from '../components/HeroCard';
import { HomeMenu } from '../components/HomeMenu';
import { MemoryAssistantSheet } from '../components/MemoryAssistantSheet';
import { NextReminderCard } from '../components/NextReminderCard';
import { QuickCaptureCard } from '../components/QuickCaptureCard';
import { RecentNotesPreview } from '../components/RecentNotesPreview';
import { useAuth } from '../context/AuthContext';
import { useNotes } from '../context/NotesContext';

export default function HomeScreen() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [memoryOpen, setMemoryOpen] = useState(false);

  const {
    note,
    setNote,
    addNote,
    saving,
    scheduledReminders,
    pendingNotes,
  } = useNotes();

  /**
   * Redirige l’utilisateur vers la connexion uniquement
   * lorsque la restauration de session est terminée.
   */
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user]);

  /**
   * Recharge le prénom de l’utilisateur lorsque l’application
   * revient au premier plan.
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshProfile();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshProfile, user]);

  const nextReminder = scheduledReminders[0];

  /**
   * On n’affiche plus null pendant le chargement.
   * Cela évite l’écran noir après la connexion ou au redémarrage.
   */
  if (loading) {
    return <LoadingScreen message="Chargement de Rappelle Moi..." />;
  }

  /**
   * Pendant que router.replace() redirige vers /login,
   * on garde un écran visible au lieu d’un écran noir.
   */
  if (!user) {
    return <LoadingScreen message="Ouverture de la connexion..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <HomeMenu
        onOpenNotes={() => router.push('/notes')}
        onOpenReminders={() => router.push('/reminders')}
        onOpenArchives={() => router.push('/archives')}
        onOpenSettings={() => router.push('/settings')}
      />

      <ScrollView
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

        <NextReminderCard reminder={nextReminder} />

        <RecentNotesPreview notes={pendingNotes} />
      </ScrollView>

      <FloatingMemoryButton onPress={() => setMemoryOpen(true)} />

      <MemoryAssistantSheet
        visible={memoryOpen}
        onClose={() => setMemoryOpen(false)}
      />
    </SafeAreaView>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingTitle}>Rappelle Moi</Text>

        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 90,
    paddingBottom: 110,
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