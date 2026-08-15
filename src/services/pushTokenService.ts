import * as Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

type RegisterPushTokenResult = {
  success: boolean;
  token?: string;
  error?: string;
};

function getProjectId(): string | null {
  const projectId =
    Constants.default.easConfig?.projectId ??
    Constants.default.expoConfig?.extra?.eas?.projectId;

  return typeof projectId === 'string'
    ? projectId
    : null;
}

function getDeviceTimezone(): string {
  try {
    return (
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'Europe/Paris'
    );
  } catch {
    return 'Europe/Paris';
  }
}

async function savePushToken(
  userId: string,
  expoPushToken: string
): Promise<RegisterPushTokenResult> {
  const timezone = getDeviceTimezone();

  const { error } = await supabase
    .from('profiles')
    .update({
      expo_push_token: expoPushToken,
      push_enabled: true,
      timezone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error(
      "Erreur d'enregistrement du token push :",
      error.message
    );

    return {
      success: false,
      error: error.message,
    };
  }

  console.log(
    '✅ Token push Daya synchronisé :',
    expoPushToken
  );

  return {
    success: true,
    token: expoPushToken,
  };
}

export async function registerPushTokenForUser(
  userId: string
): Promise<RegisterPushTokenResult> {
  if (Platform.OS === 'web') {
    return {
      success: false,
      error:
        'Les notifications push ne sont pas activées sur le web.',
    };
  }

  if (!Device.isDevice) {
    return {
      success: false,
      error:
        'Un vrai téléphone est nécessaire pour obtenir un token push.',
    };
  }

  if (!userId) {
    return {
      success: false,
      error: 'Utilisateur non identifié.',
    };
  }

  try {
    /**
     * Les canaux utilisés réellement par le backend
     * sont recréés ici par sécurité.
     */
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(
        'daya-reminders-v1',
        {
          name: 'Rappels Daya',
          description:
            'Rappels personnels avec son et vibration',
          importance:
            Notifications.AndroidImportance.MAX,
          sound: 'default',
          vibrationPattern: [0, 400, 200, 400],
          enableVibrate: true,
          enableLights: true,
          lightColor: '#2563EB',
          lockscreenVisibility:
            Notifications
              .AndroidNotificationVisibility
              .PUBLIC,
        }
      );

      await Notifications.setNotificationChannelAsync(
        'daya-briefings-v1',
        {
          name: 'Briefings Daya',
          description:
            'Bilans et résumés du matin et du soir',
          importance:
            Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 150, 250],
          enableVibrate: true,
          enableLights: true,
          lightColor: '#2563EB',
          lockscreenVisibility:
            Notifications
              .AndroidNotificationVisibility
              .PUBLIC,
        }
      );
    }

    const currentPermissions =
      await Notifications.getPermissionsAsync();

    let finalStatus = currentPermissions.status;

    if (finalStatus !== 'granted') {
      const requestedPermissions =
        await Notifications
          .requestPermissionsAsync();

      finalStatus =
        requestedPermissions.status;
    }

    if (finalStatus !== 'granted') {
      await supabase
        .from('profiles')
        .update({
          push_enabled: false,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', userId);

      return {
        success: false,
        error:
          "L'autorisation de notification n'a pas été accordée.",
      };
    }

    const projectId = getProjectId();

    if (!projectId) {
      return {
        success: false,
        error:
          'Le projectId EAS est introuvable dans app.json.',
      };
    }

    /**
     * Cette requête peut échouer temporairement
     * si le téléphone vient juste de récupérer
     * Internet après un redémarrage.
     */
    const tokenResponse =
      await Notifications
        .getExpoPushTokenAsync({
          projectId,
        });

    const expoPushToken =
      tokenResponse.data;

    if (!expoPushToken) {
      return {
        success: false,
        error:
          "Expo n'a retourné aucun token push.",
      };
    }

    return await savePushToken(
      userId,
      expoPushToken
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Erreur inconnue pendant la création du token push.';

    console.error(
      'Erreur synchronisation push Daya :',
      error
    );

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Écoute une éventuelle rotation du token
 * pendant que Daya est en fonctionnement.
 */
export function listenForPushTokenChanges(
  userId: string
) {
  if (
    Platform.OS === 'web' ||
    !Device.isDevice ||
    !userId
  ) {
    return null;
  }

  return Notifications.addPushTokenListener(
    async () => {
      console.log(
        '🔄 Changement du token push détecté.'
      );

      const result =
        await registerPushTokenForUser(
          userId
        );

      if (!result.success) {
        console.warn(
          'Impossible de resynchroniser le token :',
          result.error
        );
      }
    }
  );
}