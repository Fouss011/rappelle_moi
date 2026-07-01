const express = require('express');
const { analyseNote } = require('../services/aiNoteService');
const { findRelatedNotes } = require('../services/relatedNotesService');

const router = express.Router();

router.post('/analyse-note', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Texte manquant',
      });
    }

    const analysis = await analyseNote(text.trim());

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Erreur analyse note IA:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/related-notes', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Texte manquant',
      });
    }

    const result = await findRelatedNotes(text.trim());

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Erreur notes liées:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;