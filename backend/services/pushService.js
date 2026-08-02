const EXPO_PUSH_URL =
  'https://exp.host/--/api/v2/push/send';

const EXPO_RECEIPTS_URL =
  'https://exp.host/--/api/v2/push/getReceipts';

const HTTP_TIMEOUT_MS = 15000;
const MAX_HTTP_RETRIES = 3;

function isValidExpoPushToken(token) {
  if (typeof token !== 'string') {
    return false;
  }

  return (
    token.startsWith('ExponentPushToken[') ||
    token.startsWith('ExpoPushToken[')
  );
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function shouldRetryHttpStatus(status) {
  return status === 429 || status >= 500;
}

async function fetchJsonWithRetry(
  url,
  options,
  operationName
) {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= MAX_HTTP_RETRIES;
    attempt += 1
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, HTTP_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      const rawText = await response.text();

      let result = {};

      if (rawText) {
        try {
          result = JSON.parse(rawText);
        } catch {
          throw new Error(
            `${operationName} a retourné une réponse JSON invalide.`
          );
        }
      }

      if (!response.ok) {
        const apiMessage =
          result?.errors?.[0]?.message ||
          result?.message ||
          `Erreur HTTP ${response.status}`;

        const httpError = new Error(apiMessage);
        httpError.status = response.status;

        if (
          shouldRetryHttpStatus(response.status) &&
          attempt < MAX_HTTP_RETRIES
        ) {
          lastError = httpError;
          await sleep(1000 * 2 ** (attempt - 1));
          continue;
        }

        throw httpError;
      }

      return result;
    } catch (error) {
      const normalizedError =
        error?.name === 'AbortError'
          ? new Error(
              `${operationName} a dépassé ${HTTP_TIMEOUT_MS / 1000} secondes.`
            )
          : error;

      const retryableNetworkError =
        error?.name === 'AbortError' ||
        typeof error?.status !== 'number';

      if (
        retryableNetworkError &&
        attempt < MAX_HTTP_RETRIES
      ) {
        lastError = normalizedError;
        await sleep(1000 * 2 ** (attempt - 1));
        continue;
      }

      throw normalizedError;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error(`${operationName} a échoué.`);
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

  const result = await fetchJsonWithRetry(
    EXPO_PUSH_URL,
    {
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
    },
    "L'envoi Expo Push"
  );

  const ticket = Array.isArray(result.data)
    ? result.data[0]
    : result.data;

  if (!ticket) {
    throw new Error(
      "Expo n'a retourné aucun ticket de notification."
    );
  }

  if (ticket.status === 'error') {
    const error = new Error(
      ticket.message ||
        ticket.details?.error ||
        "Expo a refusé l'envoi de la notification."
    );

    error.expoError =
      ticket.details?.error || null;

    throw error;
  }

  if (ticket.status !== 'ok' || !ticket.id) {
    throw new Error(
      'Ticket Expo Push incomplet ou invalide.'
    );
  }

  return ticket;
}

async function getExpoPushReceipts(ticketIds) {
  const uniqueTicketIds = [
    ...new Set(
      (ticketIds || []).filter(
        (ticketId) =>
          typeof ticketId === 'string' &&
          ticketId.trim().length > 0
      )
    ),
  ];

  if (uniqueTicketIds.length === 0) {
    return {};
  }

  if (uniqueTicketIds.length > 1000) {
    throw new Error(
      'Expo accepte au maximum 1000 reçus par requête.'
    );
  }

  const result = await fetchJsonWithRetry(
    EXPO_RECEIPTS_URL,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids: uniqueTicketIds,
      }),
    },
    'La vérification des reçus Expo Push'
  );

  return result?.data ?? {};
}

module.exports = {
  isValidExpoPushToken,
  sendExpoPushNotification,
  getExpoPushReceipts,
};
