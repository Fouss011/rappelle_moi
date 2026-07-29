const cron = require('node-cron');

const {
  startMorningRoutine,
  startNightRoutine,
} = require('./assistantService');

function startScheduler() {
  cron.schedule(
    '0 21 * * *',
    async () => {
      console.log(
        '🌙 Lancement automatique du bilan Daya...'
      );

      try {
        const results = await startNightRoutine();

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
        const results = await startMorningRoutine();

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

  console.log('⏰ Scheduler Daya actif');
}

module.exports = {
  startScheduler,
};