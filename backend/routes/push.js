const express = require('express');

const supabase = require('../config/supabase');
const {
  sendExpoPushNotification,
} = require('../services/pushService');

const {
  startMorningRoutine,
  startNightRoutine,
} = require('../services/assistantService');

const router = express.Router();

function requireAdminKey(req, res, next) {
  const providedKey = req.headers['x-daya-admin-key'];
  const expectedKey = process.env.DAYA_ADMIN_KEY;

  if (!expectedKey) {
    return res.status(500).json({
      success: false,
      error: 'DAYA_ADMIN_KEY absente du serveur.',
    });
  }

  if (providedKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'Accès refusé.',
    });
  }

  next();
}

router.get('/status/:userId', requireAdminKey, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        'id, first_name, expo_push_token, push_enabled, timezone, updated_at'
      )
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profil introuvable.',
      });
    }

    return res.json({
      success: true,
      profile: {
        id: profile.id,
        firstName: profile.first_name,
        tokenRegistered: Boolean(profile.expo_push_token),
        pushEnabled: profile.push_enabled,
        timezone: profile.timezone,
        updatedAt: profile.updated_at,
      },
    });
  } catch (error) {
    console.error('Erreur statut push :', error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/test', requireAdminKey, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId manquant.',
      });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        'id, first_name, expo_push_token, push_enabled, timezone'
      )
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profil introuvable.',
      });
    }

    if (!profile.push_enabled) {
      return res.status(400).json({
        success: false,
        error:
          "Les notifications push sont désactivées pour cet utilisateur.",
      });
    }

    if (!profile.expo_push_token) {
      return res.status(400).json({
        success: false,
        error:
          "Aucun token push enregistré. Installe et ouvre d'abord le prochain APK.",
      });
    }

    const firstName = profile.first_name || 'toi';

    const ticket = await sendExpoPushNotification({
      token: profile.expo_push_token,
      title: 'Daya',
      body: `Bonjour ${firstName} 👋 Le push serveur de Daya fonctionne.`,
      data: {
        kind: 'server_push_test',
        userId: profile.id,
        sentAt: new Date().toISOString(),
      },
    });

    return res.json({
      success: true,
      message: 'Notification envoyée à Expo.',
      ticket,
    });
  } catch (error) {
    console.error('Erreur test push :', error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/run-morning', requireAdminKey, async (_req, res) => {
  try {
    const results = await startMorningRoutine();

    return res.json({
      success: true,
      routine: 'morning',
      usersProcessed: results.length,
      results,
    });
  } catch (error) {
    console.error('Erreur exécution manuelle matin :', error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/run-evening', requireAdminKey, async (_req, res) => {
  try {
    const results = await startNightRoutine();

    return res.json({
      success: true,
      routine: 'evening',
      usersProcessed: results.length,
      results,
    });
  } catch (error) {
    console.error('Erreur exécution manuelle soir :', error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});



module.exports = router;