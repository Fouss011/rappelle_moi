const cron = require('node-cron');

const {
  startMorningRoutine,
  startNightRoutine,
} = require('./assistantService');

const {
  processDueReminders,
  processPendingReceipts,
} = require('./reminderPushService');

function startScheduler() {
  cron.schedule(
    '0 21 * * *',
    async () => {
      console.log(
        '🌙 Lancement automatique du bilan Daya...'
      );

      try {
        const results =
          await startNightRoutine();

        console.log(
          '✅ Routine du soir terminée :',
          results
        );
      } catch (error) {
        console.error(
          '❌ Erreur routine du soir :',
          error.message
        );
      }
    },
    {
      timezone: 'Europe/Paris',
    }
  );

  cron.schedule(
    '0 8 * * *',
    async () => {
      console.log(
        '🌅 Lancement automatique du briefing Daya...'
      );

      try {
        const results =
          await startMorningRoutine();

        console.log(
          '✅ Routine du matin terminée :',
          results
        );
      } catch (error) {
        console.error(
          '❌ Erreur routine du matin :',
          error.message
        );
      }
    },
    {
      timezone: 'Europe/Paris',
    }
  );

  cron.schedule(
    '* * * * *',
    async () => {
      try {
        const result =
          await processDueReminders();

        if (
          result.remindersFound > 0 ||
          result.failed > 0
        ) {
          console.log(
            '🔔 Rappels personnels envoyés à Expo :',
            result
          );
        }
      } catch (error) {
        console.error(
          '❌ Erreur traitement des rappels personnels :',
          error.message
        );
      }
    },
    {
      timezone: 'Europe/Paris',
    }
  );

  cron.schedule(
    '*/5 * * * *',
    async () => {
      try {
        const result =
          await processPendingReceipts();

        if (
          result.receiptsFound > 0 ||
          result.failed > 0
        ) {
          console.log(
            '🧾 Reçus Expo Push vérifiés :',
            result
          );
        }
      } catch (error) {
        console.error(
          '❌ Erreur vérification des reçus Expo :',
          error.message
        );
      }
    },
    {
      timezone: 'Europe/Paris',
    }
  );

  console.log(
    '⏰ Scheduler Daya actif : 8 h, 21 h, rappels chaque minute, reçus toutes les 5 minutes.'
  );
}

module.exports = {
  startScheduler,
};
