import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Platform, SafeAreaView, ScrollView, StyleSheet } from 'react-native';

import { FloatingMemoryButton } from '../components/FloatingMemoryButton';
import { HeroCard } from '../components/HeroCard';
import { HomeMenu } from '../components/HomeMenu';
import { MemoryAssistantSheet } from '../components/MemoryAssistantSheet';
import { NextReminderCard } from '../components/NextReminderCard';
import { QuickCaptureCard } from '../components/QuickCaptureCard';
import { RecentNotesPreview } from '../components/RecentNotesPreview';
import { useAuth } from '../context/AuthContext';
import { useNotes } from '../context/NotesContext';
import { registerForPushNotificationsAsync } from '../services/pushService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

  useEffect(() => {
  const setupNotifications = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'RappelleMoi',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }

    const permission = await Notifications.requestPermissionsAsync();

    if (permission.granted) {
      const pushToken = await registerForPushNotificationsAsync();
      console.log('TOKEN PUSH UTILISATEUR:', pushToken);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test RappelleMoi',
          body: 'Si tu vois ça, les notifications marchent.',
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 10,
          channelId: 'default',
        },
      });
    }
  };

  setupNotifications(); // ← IL MANQUE CETTE LIGNE

}, []);
  useEffect(() => {
  if (!loading && !user) {
    router.replace('/login' as any);
  }
}, [loading, user]);

useEffect(() => {
  const subscription = AppState.addEventListener('change', async (state) => {
    if (state === 'active') {
      await refreshProfile();
    }
  });

  return () => {
    subscription.remove();
  };
}, [refreshProfile]);

  const nextReminder = scheduledReminders[0];

  if (loading) {
  return null;
}

if (!user) {
  return null;
}

  return (
    <SafeAreaView style={styles.container}>
      <HomeMenu
        onOpenNotes={() => router.push('/notes')}
        onOpenReminders={() => router.push('/reminders')}
        onOpenArchives={() => router.push('/archives')}
        onOpenSettings={() => router.push('/settings')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <HeroCard
          userName={profile?.first_name || user.email?.split('@')[0] || 'Utilisateur'}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },

  content: {
    padding: 22,
    paddingTop: 90,
    paddingBottom: 42,
  },
});