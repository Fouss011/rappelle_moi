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

  return typeof projectId === 'string' ? projectId : null;
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

export async function registerPushTokenForUser(
  userId: string
): Promise<RegisterPushTokenResult> {
  if (Platform.OS === 'web') {
    return {
      success: false,
      error: 'Les notifications push ne sont pas activées sur le web.',
    };
  }

  if (!Device.isDevice) {
    return {
      success: false,
      error: 'Un vrai téléphone est nécessaire pour obtenir un token push.',
    };
  }

  try {
    /**
     * Le canal est normalement déjà créé dans _layout.tsx.
     * On le recrée ici par sécurité : Android réutilisera
     * simplement le canal existant.
     */
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Daya',
        description: 'Rappels et briefings intelligents de Daya',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        enableLights: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const currentPermissions =
      await Notifications.getPermissionsAsync();

    let finalStatus = currentPermissions.status;

    if (finalStatus !== 'granted') {
      const requestedPermissions =
        await Notifications.requestPermissionsAsync();

      finalStatus = requestedPermissions.status;
    }

    if (finalStatus !== 'granted') {
      await supabase
        .from('profiles')
        .update({
          push_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return {
        success: false,
        error: "L'autorisation de notification n'a pas été accordée.",
      };
    }

    const projectId = getProjectId();

    if (!projectId) {
      return {
        success: false,
        error: 'Le projectId EAS est introuvable dans app.json.',
      };
    }

    const tokenResponse =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    const expoPushToken = tokenResponse.data;
    console.log("TOKEN DAYA :", expoPushToken);

    if (!expoPushToken) {
      return {
        success: false,
        error: "Expo n'a retourné aucun token push.",
      };
    }
    

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

    console.log('Token push Daya enregistré avec succès.');

    return {
      success: true,
      token: expoPushToken,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Erreur inconnue pendant la création du token push.';

    console.error(
      "Erreur pendant l'initialisation du push Daya :",
      error
    );

    return {
      success: false,
      error: message,
    };
  }
}