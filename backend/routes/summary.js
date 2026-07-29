const express = require('express');

const supabase = require('../config/supabase');

const {
  generateSummary,
  generateAndSaveDailySummary,
} = require('../services/aiSummaryService');

const {
  generateMorningBrief,
} = require('../services/morningBriefService');

const {
  askMemory,
} = require('../services/memoryService');

const {
  detectPatterns,
} = require('../services/patternService');

const {
  requireUser,
} = require('../middleware/requireUser');

const router = express.Router();

async function getUserTimezone(userId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn(
      'Impossible de récupérer la timezone utilisateur :',
      error.message
    );
  }

  return profile?.timezone || 'Europe/Paris';
}

/**
 * Route publique très simple permettant seulement
 * de vérifier que le groupe de routes fonctionne.
 */
router.get('/test', (_req, res) => {
  return res.json({
    success: true,
    message: 'Routes Daya summary opérationnelles',
  });
});

/**
 * Génère un résumé à partir de notes fournies par
 * l'utilisateur connecté.
 */
router.post(
  '/generate',
  requireUser,
  async (req, res) => {
    try {
      const { notes } = req.body;

      if (!Array.isArray(notes)) {
        return res.status(400).json({
          success: false,
          error: 'La liste des notes est manquante ou invalide.',
        });
      }

      const summary = await generateSummary(notes);

      return res.json({
        success: true,
        summary,
      });
    } catch (error) {
      console.error(
        'Erreur génération résumé IA :',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          'Erreur pendant la génération du résumé.',
      });
    }
  }
);

/**
 * Génère et sauvegarde le bilan quotidien uniquement
 * pour l'utilisateur connecté.
 */
router.post(
  '/generate-daily',
  requireUser,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const timezone = await getUserTimezone(userId);

      const summary =
        await generateAndSaveDailySummary(
          userId,
          timezone
        );

      return res.json({
        success: true,
        summary,
      });
    } catch (error) {
      console.error(
        'Erreur résumé quotidien :',
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Génère le briefing du matin uniquement à partir
 * des données personnelles de l'utilisateur connecté.
 */
router.post(
  '/morning-brief',
  requireUser,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const timezone = await getUserTimezone(userId);

      const brief = await generateMorningBrief(
        userId,
        timezone
      );

      return res.json({
        success: true,
        brief,
      });
    } catch (error) {
      console.error(
        'Erreur briefing matin :',
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Interroge uniquement les notes appartenant
 * à l'utilisateur connecté.
 */
router.post(
  '/ask-memory',
  requireUser,
  async (req, res) => {
    try {
      const { question } = req.body;
      const userId = req.user.id;

      if (!question?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Question manquante',
        });
      }

      const answer = await askMemory(
        question.trim(),
        userId
      );

      return res.json({
        success: true,
        answer,
      });
    } catch (error) {
      console.error(
        'Erreur agent mémoire :',
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Analyse les habitudes, projets et priorités
 * uniquement pour l'utilisateur connecté.
 */
router.post(
  '/patterns',
  requireUser,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const patterns = await detectPatterns(userId);

      return res.json({
        success: true,
        patterns,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        'Erreur analyse habitudes :',
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

module.exports = router;