const { generateAndSaveDailySummary } = require('./aiSummaryService');
const { generateMorningBrief } = require('./morningBriefService');
const { detectPatterns } = require('./patternService');

async function startMorningRoutine() {
  console.log('🌅 Début routine du matin');

  try {
    const patterns = await detectPatterns();

    const brief = await generateMorningBrief();

    console.log('✅ Habitudes analysées');
    console.log('✅ Briefing généré');

    return {
      patterns,
      brief,
    };
  } catch (error) {
    console.error(error);

    throw error;
  }
}

async function startNightRoutine() {
  console.log('🌙 Début routine du soir');

  try {
    const summary = await generateAndSaveDailySummary();

    const patterns = await detectPatterns();

    console.log('✅ Résumé sauvegardé');
    console.log('✅ Habitudes mises à jour');

    return {
      summary,
      patterns,
    };
  } catch (error) {
    console.error(error);

    throw error;
  }
}

module.exports = {
  startMorningRoutine,
  startNightRoutine,
};