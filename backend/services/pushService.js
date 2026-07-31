const EXPO_PUSH_URL =
  'https://exp.host/--/api/v2/push/send';

function isValidExpoPushToken(token) {
  if (typeof token !== 'string') {
    return false;
  }

  return (
    token.startsWith('ExponentPushToken[') ||
    token.startsWith('ExpoPushToken[')
  );
}

async function sendExpoPushNotification({
  token,
  title,
  body,
  data = {},
  channelId = 'daya-briefings-v1',
}) {
  if (!isValidExpoPushToken(token)) {
    throw new Error(
      'Token Expo Push invalide ou manquant.'
    );
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.errors?.[0]?.message ||
        `Erreur Expo Push HTTP ${response.status}`
    );
  }

  const ticket = Array.isArray(result.data)
    ? result.data[0]
    : result.data;

  if (ticket?.status === 'error') {
    throw new Error(
      ticket.message ||
        ticket.details?.error ||
        "Expo a refusé l'envoi de la notification."
    );
  }

  return ticket;
}

module.exports = {
  isValidExpoPushToken,
  sendExpoPushNotification,
};