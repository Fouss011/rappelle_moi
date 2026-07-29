const supabase = require('../config/supabase');

async function requireUser(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        success: false,
        error: 'Session utilisateur manquante.',
      });
    }

    const accessToken = authorization.slice('Bearer '.length).trim();

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Token utilisateur manquant.',
      });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Session invalide ou expirée.',
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error(
      "Erreur de vérification de l'utilisateur :",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Impossible de vérifier l'utilisateur.",
    });
  }
}

module.exports = {
  requireUser,
};