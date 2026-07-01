import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!Device.isDevice) {
    console.log('Les notifications push nécessitent un vrai téléphone.');
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } =
      await Notifications.requestPermissionsAsync();

    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission notification refusée.');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync();

  console.log('Expo Push Token:', token.data);

  return token.data;
}