const cron = require('node-cron');
const {
  startMorningRoutine,
  startNightRoutine,
} = require('./assistantService');

function startScheduler() {
  // Tous les jours à 21h00
  cron.schedule('0 21 * * *', async () => {
    console.log('🧠 Génération automatique du résumé du soir...');

    try {
      await startNightRoutine();
      console.log('✅ Résumé du soir généré et sauvegardé');
    } catch (error) {
      console.error('❌ Erreur résumé automatique:', error.message);
    }
  }, {
    timezone: 'Europe/Paris',
  });

  // Tous les jours à 08h00
  cron.schedule('0 8 * * *', async () => {
    console.log('🌅 Génération automatique du briefing du matin...');

    try {
      const brief = await startMorningRoutine();
      console.log('✅ Briefing du matin généré:', brief);
    } catch (error) {
      console.error('❌ Erreur briefing automatique:', error.message);
    }
  }, {
    timezone: 'Europe/Paris',
  });

  console.log('⏰ Scheduler Rappelle Moi actif');
}

module.exports = {
  startScheduler,
};