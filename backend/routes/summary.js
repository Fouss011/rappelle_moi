const express = require('express');
const {
  generateSummary,
  generateAndSaveDailySummary,
} = require('../services/aiSummaryService');
const { generateMorningBrief } = require('../services/morningBriefService');
const { askMemory } = require('../services/memoryService');
const { detectPatterns } = require('../services/patternService');

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    message: 'Route summary OK',
  });
});

router.post('/generate', async (req, res) => {
  try {
    const { notes } = req.body;

    const summary = await generateSummary(notes);

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Erreur génération résumé IA:', error);

    res.status(500).json({
      success: false,
      error: 'Erreur génération résumé IA',
    });
  }
});
router.post('/generate-daily', async (req, res) => {
  try {
    const summary = await generateAndSaveDailySummary();

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Erreur résumé quotidien:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/morning-brief', async (req, res) => {
  try {
    const brief = await generateMorningBrief();

    res.json({
      success: true,
      brief,
    });
  } catch (error) {
    console.error('Erreur briefing matin:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/ask-memory', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question manquante',
      });
    }

    const answer = await askMemory(question);

    res.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error('Erreur agent mémoire:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/patterns', async (req, res) => {
  try {
    const patterns = await detectPatterns();

    res.json({
      success: true,
      patterns,
    });

  } catch (error) {
    console.error('Erreur analyse habitudes :', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
module.exports = router;