const express = require('express');

const {
  requireUser,
} = require('../middleware/requireUser');

const {
  analyseNote,
} = require('../services/aiNoteService');

const {
  findRelatedNotes,
} = require('../services/relatedNotesService');

const {
  saveConnectionFeedback,
  getConfirmedCluster,
  listConfirmedConnectionClusters,
} = require('../services/memoryConnectionService');

const {
  detectPatterns,
} = require('../services/patternService');

const {
  getLivingMemory,
  refreshLivingMemory,
} = require('../services/livingMemoryService');

const router = express.Router();

router.post(
  '/analyse-note',
  requireUser,
  async (req, res) => {
    try {
      const { text } = req.body;

      if (!text?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Texte manquant',
        });
      }

      const analysis = await analyseNote(
        text.trim()
      );

      return res.json({
        success: true,
        analysis,
      });
    } catch (error) {
      console.error(
        'Erreur analyse note IA :',
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

router.post(
  '/related-notes',
  requireUser,
  async (req, res) => {
    try {
      const { text, excludeNoteId } = req.body;
      const userId = req.user.id;

      if (!text?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Texte manquant',
        });
      }

      const result = await findRelatedNotes(
        text.trim(),
        userId,
        {
          excludeNoteId:
            typeof excludeNoteId === 'string'
              ? excludeNoteId
              : null,
        }
      );

      return res.json({
        success: true,
        sourceNoteId:
          typeof excludeNoteId === 'string'
            ? excludeNoteId
            : '',
        ...result,
      });
    } catch (error) {
      console.error(
        'Erreur notes liées :',
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);


router.post(
  '/memory-connections/feedback',
  requireUser,
  async (req, res) => {
    try {
      const {
        sourceNoteId,
        relatedNoteIds,
        status,
      } = req.body ?? {};

      const result = await saveConnectionFeedback({
        userId: req.user.id,
        sourceNoteId,
        relatedNoteIds,
        status,
      });

      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error(
        'Erreur validation connexion mémoire :',
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

router.post(
  '/memory-connections/cluster',
  requireUser,
  async (req, res) => {
    try {
      const noteIds = Array.isArray(req.body?.noteIds)
        ? req.body.noteIds
        : [];

      const clusterNoteIds =
        await getConfirmedCluster({
          userId: req.user.id,
          noteIds,
        });

      return res.json({
        success: true,
        noteIds: clusterNoteIds,
      });
    } catch (error) {
      console.error(
        'Erreur lecture fil mémoire confirmé :',
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);



router.get(
  '/memory-connections',
  requireUser,
  async (req, res) => {
    try {
      const connections =
        await listConfirmedConnectionClusters({
          userId: req.user.id,
        });

      return res.json({
        success: true,
        connections,
      });
    } catch (error) {
      console.error(
        'Erreur liste connexions mémoire :',
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

router.get(
  '/insights',
  requireUser,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const insights =
        await detectPatterns(userId);

      return res.json({
        success: true,
        insights,
        generatedAt:
          new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        'Erreur insights Daya :',
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

router.get(
  '/living-memory',
  requireUser,
  async (req, res) => {
    try {
      const memory = await getLivingMemory(
        req.user.id
      );

      return res.json({
        success: true,
        memory,
      });
    } catch (error) {
      console.error(
        'Erreur lecture mémoire vivante :',
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

router.post(
  '/living-memory/refresh',
  requireUser,
  async (req, res) => {
    try {
      const force =
        req.body?.force === true;

      const memory =
        await refreshLivingMemory(
          req.user.id,
          { force }
        );

      return res.json({
        success: true,
        memory,
      });
    } catch (error) {
      console.error(
        'Erreur actualisation mémoire vivante :',
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