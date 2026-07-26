import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';

type PermissionState = 'loading' | 'granted' | 'denied' | 'undetermined';

export default function SettingsScreen() {
  const { signOut, profile, user } = useAuth();

  const [permissionState, setPermissionState] =
    useState<PermissionState>('loading');

  const [scheduledCount, setScheduledCount] = useState(0);
  const [checking, setChecking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [cancellingTests, setCancellingTests] = useState(false);
  const [testMessage, setTestMessage] = useState('');

  /**
   * Vérifie les autorisations et compte toutes les
   * notifications actuellement programmées sur le téléphone.
   */
  const refreshNotificationStatus = useCallback(async () => {
    if (Platform.OS === 'web') {
      setPermissionState('denied');
      setScheduledCount(0);
      return;
    }

    setChecking(true);

    try {
      const permissions = await Notifications.getPermissionsAsync();

      if (permissions.granted || permissions.status === 'granted') {
        setPermissionState('granted');
      } else if (permissions.status === 'denied') {
        setPermissionState('denied');
      } else {
        setPermissionState('undetermined');
      }

      const scheduledNotifications =
        await Notifications.getAllScheduledNotificationsAsync();

      setScheduledCount(scheduledNotifications.length);
    } catch (error) {
      console.error(
        'Erreur pendant la vérification des notifications :',
        error
      );

      setPermissionState('denied');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refreshNotificationStatus();
  }, [refreshNotificationStatus]);

  /**
   * Demande l'autorisation Android/iOS si elle n'est
   * pas encore accordée.
   */
  const requestNotificationPermission = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Non disponible',
        'Ce test doit être réalisé sur l’application Android.'
      );
      return false;
    }

    try {
      const permissions =
        await Notifications.requestPermissionsAsync();

      const granted =
        permissions.granted ||
        permissions.status === 'granted';

      setPermissionState(granted ? 'granted' : 'denied');

      return granted;
    } catch (error) {
      console.error(
        "Erreur pendant la demande d'autorisation :",
        error
      );

      return false;
    }
  };

  /**
   * Programme une notification locale qui doit apparaître
   * quinze secondes après l'appui sur le bouton.
   */
  const testNotification = async () => {
    if (testing) {
      return;
    }

    setTesting(true);
    setTestMessage('');

    try {
      let allowed = permissionState === 'granted';

      if (!allowed) {
        allowed = await requestNotificationPermission();
      }

      if (!allowed) {
        setTestMessage(
          'Les notifications sont bloquées. Ouvre les paramètres Android pour les autoriser.'
        );

        Alert.alert(
          'Notifications bloquées',
          'Autorise les notifications de Rappelle Moi dans les paramètres du téléphone.'
        );

        return;
      }

      /**
       * Le canal est recréé ici par sécurité.
       * Android renverra simplement le canal existant
       * s'il est déjà correctement configuré.
       */
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(
          'default',
          {
            name: 'Rappels',
            description:
              'Notifications et rappels de Rappelle Moi',
            importance:
              Notifications.AndroidImportance.MAX,
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
            enableVibrate: true,
            enableLights: true,
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
          }
        );
      }

      const triggerDate = new Date(Date.now() + 15_000);

      const notificationId =
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Test Rappelle Moi',
            body: 'Si tu vois ce message, les notifications locales fonctionnent.',
            sound: 'default',
            data: {
              kind: 'notification_test',
              createdAtIso: new Date().toISOString(),
            },
          },

          trigger: {
            type:
              Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
            channelId: 'default',
          },
        });

      console.log('Notification de test programmée :', {
        notificationId,
        triggerDate: triggerDate.toISOString(),
      });

      const displayTime = triggerDate.toLocaleTimeString(
        'fr-FR',
        {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }
      );

      setTestMessage(
        `Test programmé pour ${displayTime}. Verrouille le téléphone ou quitte l’application.`
      );

      await refreshNotificationStatus();

      Alert.alert(
        'Test programmé',
        `La notification doit apparaître vers ${displayTime}.\n\nQuitte l’application ou verrouille le téléphone pendant quelques secondes.`
      );
    } catch (error) {
      console.error(
        'Erreur pendant le test de notification :',
        error
      );

      setTestMessage(
        "Le test n'a pas pu être programmé."
      );

      Alert.alert(
        'Erreur',
        "La notification de test n'a pas pu être programmée."
      );
    } finally {
      setTesting(false);
    }
  };

  /**
   * Annule uniquement les notifications créées
   * par le bouton de test.
   *
   * Les vrais rappels et les notifications quotidiennes
   * ne sont pas supprimés.
   */
  const cancelTestNotifications = async () => {
    if (Platform.OS === 'web' || cancellingTests) {
      return;
    }

    setCancellingTests(true);

    try {
      const scheduledNotifications =
        await Notifications.getAllScheduledNotificationsAsync();

      const testNotifications = scheduledNotifications.filter(
        (notification) =>
          notification.content.data?.kind ===
          'notification_test'
      );

      await Promise.all(
        testNotifications.map((notification) =>
          Notifications.cancelScheduledNotificationAsync(
            notification.identifier
          )
        )
      );

      setTestMessage(
        testNotifications.length > 0
          ? `${testNotifications.length} test(s) annulé(s).`
          : 'Aucune notification de test à annuler.'
      );

      await refreshNotificationStatus();
    } catch (error) {
      console.error(
        "Erreur pendant l'annulation des tests :",
        error
      );

      Alert.alert(
        'Erreur',
        "Les notifications de test n'ont pas pu être annulées."
      );
    } finally {
      setCancellingTests(false);
    }
  };

  const openApplicationSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error(
        "Impossible d'ouvrir les paramètres Android :",
        error
      );

      Alert.alert(
        'Paramètres indisponibles',
        'Ouvre manuellement Paramètres > Applications > Rappelle Moi > Notifications.'
      );
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const permissionLabel = (() => {
    switch (permissionState) {
      case 'granted':
        return 'Autorisées';

      case 'denied':
        return 'Bloquées';

      case 'undetermined':
        return 'Non demandées';

      default:
        return 'Vérification...';
    }
  })();

  const permissionDescription = (() => {
    switch (permissionState) {
      case 'granted':
        return 'Android autorise Rappelle Moi à afficher des notifications.';

      case 'denied':
        return 'Android bloque actuellement les notifications de cette application.';

      case 'undetermined':
        return "L'autorisation n'a pas encore été accordée.";

      default:
        return 'Lecture des autorisations Android...';
    }
  })();

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Paramètres</Text>

        <Text style={styles.subtitle}>
          Compte connecté :{' '}
          {profile?.first_name ||
            user?.email ||
            'Utilisateur'}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Diagnostic des notifications
          </Text>

          <Text style={styles.sectionDescription}>
            Cette zone permet de vérifier directement si
            Android accepte et programme les notifications
            locales.
          </Text>

          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusLabel}>
                  Autorisation
                </Text>

                <Text
                  style={[
                    styles.statusValue,
                    permissionState === 'granted'
                      ? styles.statusGranted
                      : permissionState === 'denied'
                        ? styles.statusDenied
                        : styles.statusPending,
                  ]}
                >
                  {permissionLabel}
                </Text>
              </View>

              {checking ? (
                <ActivityIndicator />
              ) : (
                <View
                  style={[
                    styles.statusDot,
                    permissionState === 'granted'
                      ? styles.statusDotGranted
                      : styles.statusDotBlocked,
                  ]}
                />
              )}
            </View>

            <Text style={styles.statusDescription}>
              {permissionDescription}
            </Text>

            <View style={styles.countRow}>
              <Text style={styles.countLabel}>
                Notifications programmées
              </Text>

              <Text style={styles.countValue}>
                {scheduledCount}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.testButton,
              testing && styles.disabledButton,
            ]}
            onPress={() => {
              void testNotification();
            }}
            disabled={testing}
            activeOpacity={0.85}
          >
            {testing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.testButtonText}>
                Tester dans 15 secondes
              </Text>
            )}
          </TouchableOpacity>

          {testMessage ? (
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>
                {testMessage}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              void refreshNotificationStatus();
            }}
            disabled={checking}
            activeOpacity={0.8}
          >
            {checking ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.secondaryButtonText}>
                Actualiser le diagnostic
              </Text>
            )}
          </TouchableOpacity>

          {permissionState !== 'granted' ? (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => {
                void openApplicationSettings();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.settingsButtonText}>
                Ouvrir les paramètres Android
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              void cancelTestNotifications();
            }}
            disabled={cancellingTests}
            activeOpacity={0.8}
          >
            {cancellingTests ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.cancelButtonText}>
                Annuler les notifications de test
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              void handleLogout();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.logoutText}>
              Se déconnecter
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: 50,
  },

  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    marginBottom: 18,
  },

  backText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },

  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#64748B',
  },

  section: {
    marginTop: 26,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },

  sectionDescription: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: '#64748B',
  },

  statusCard: {
    marginTop: 18,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },

  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statusTextContainer: {
    flex: 1,
  },

  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  statusValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '900',
  },

  statusGranted: {
    color: '#16A34A',
  },

  statusDenied: {
    color: '#DC2626',
  },

  statusPending: {
    color: '#D97706',
  },

  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },

  statusDotGranted: {
    backgroundColor: '#22C55E',
  },

  statusDotBlocked: {
    backgroundColor: '#EF4444',
  },

  statusDescription: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: '#64748B',
  },

  countRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E6ECF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  countLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },

  countValue: {
    minWidth: 38,
    textAlign: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E0EAFF',
    fontSize: 15,
    fontWeight: '900',
    color: '#2563EB',
  },

  testButton: {
    height: 56,
    marginTop: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },

  testButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  disabledButton: {
    opacity: 0.55,
  },

  messageCard: {
    marginTop: 12,
    borderRadius: 16,
    padding: 13,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  messageText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: '#1E40AF',
  },

  secondaryButton: {
    height: 50,
    marginTop: 12,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#334155',
  },

  settingsButton: {
    height: 50,
    marginTop: 12,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  settingsButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#C2410C',
  },

  cancelButton: {
    minHeight: 48,
    marginTop: 12,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  cancelButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '900',
    color: '#475569',
  },

  logoutButton: {
    marginTop: 16,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoutText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '900',
  },
});