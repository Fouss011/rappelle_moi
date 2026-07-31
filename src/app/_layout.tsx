import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../context/AuthContext';
import { NotesProvider } from '../context/NotesContext';

/**
 * Définit la manière dont une notification doit apparaître
 * lorsque l'application est actuellement ouverte.
 *
 * Sans ce handler, une notification locale peut être déclenchée
 * sans forcément être visible à l'écran au premier plan.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    let isMounted = true;

    async function initializeNotifications() {
      try {
        /**
         * Sur Android, toutes les notifications seront rattachées
         * au canal nommé "default".
         */
        if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync(
    'daya-reminders-v1',
    {
      name: 'Rappels Daya',
      description:
        'Rappels personnels avec son et vibration',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 400, 200, 400],
      enableLights: true,
      lightColor: '#2563EB',
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    }
  );

  await Notifications.setNotificationChannelAsync(
    'daya-briefings-v1',
    {
      name: 'Briefings Daya',
      description:
        'Bilans et résumés du matin et du soir',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 250, 150, 250],
      enableLights: true,
      lightColor: '#2563EB',
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    }
  );
}

        /**
         * Vérifie d'abord si l'utilisateur a déjà donné son autorisation.
         */
        const currentPermissions =
          await Notifications.getPermissionsAsync();

        let finalStatus = currentPermissions.status;

        /**
         * Ne redemande l'autorisation que si elle n'est pas déjà accordée.
         */
        if (currentPermissions.status !== 'granted') {
          const requestedPermissions =
            await Notifications.requestPermissionsAsync();

          finalStatus = requestedPermissions.status;
        }

        if (!isMounted) {
          return;
        }

        if (finalStatus !== 'granted') {
          console.warn(
            "Les notifications ne sont pas autorisées sur cet appareil."
          );
          return;
        }

        console.log('Notifications initialisées avec succès.');
      } catch (error) {
        console.error(
          "Erreur pendant l'initialisation des notifications :",
          error
        );
      }
    }

    void initializeNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider
        value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
      >
        <AuthProvider>
          <NotesProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                contentStyle: {
                  backgroundColor:
                    colorScheme === 'dark' ? '#0F172A' : '#F4F7FB',
                },
              }}
            />
          </NotesProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}