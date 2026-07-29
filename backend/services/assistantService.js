const supabase = require('../config/supabase');

const {
  generateAndSaveDailySummary,
} = require('./aiSummaryService');

const {
  generateMorningBrief,
} = require('./morningBriefService');

const {
  isValidExpoPushToken,
  sendExpoPushNotification,
} = require('./pushService');

async function getPushUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, first_name, expo_push_token, push_enabled, timezone'
    )
    .eq('push_enabled', true)
    .not('expo_push_token', 'is', null);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).filter((profile) =>
    isValidExpoPushToken(profile.expo_push_token)
  );
}

async function startMorningRoutine() {
  console.log('🌅 Début routine Daya du matin');

  const users = await getPushUsers();

  console.log(
    `🌅 ${users.length} utilisateur(s) éligible(s) au briefing`
  );

  const results = [];

  for (const profile of users) {
    try {
      const timezone =
        profile.timezone || 'Europe/Paris';

      const brief = await generateMorningBrief(
        profile.id,
        timezone
      );

      const ticket = await sendExpoPushNotification({
        token: profile.expo_push_token,
        title: 'Daya — Brief du matin',
        body: brief,
        data: {
          kind: 'server_morning_brief',
          userId: profile.id,
          sentAt: new Date().toISOString(),
        },
      });

      results.push({
        userId: profile.id,
        success: true,
        ticket,
      });

      console.log(
        `✅ Brief du matin envoyé à ${
          profile.first_name || profile.id
        }`
      );
    } catch (error) {
      console.error(
        `❌ Erreur briefing utilisateur ${profile.id} :`,
        error.message
      );

      results.push({
        userId: profile.id,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

async function startNightRoutine() {
  console.log('🌙 Début routine Daya du soir');

  const users = await getPushUsers();

  console.log(
    `🌙 ${users.length} utilisateur(s) éligible(s) au bilan`
  );

  const results = [];

  for (const profile of users) {
    try {
      const timezone =
        profile.timezone || 'Europe/Paris';

      const summary =
        await generateAndSaveDailySummary(
          profile.id,
          timezone
        );

      const ticket = await sendExpoPushNotification({
        token: profile.expo_push_token,
        title: 'Daya — Bilan du soir',
        body: summary,
        data: {
          kind: 'server_evening_summary',
          userId: profile.id,
          sentAt: new Date().toISOString(),
        },
      });

      results.push({
        userId: profile.id,
        success: true,
        ticket,
      });

      console.log(
        `✅ Bilan du soir envoyé à ${
          profile.first_name || profile.id
        }`
      );
    } catch (error) {
      console.error(
        `❌ Erreur bilan utilisateur ${profile.id} :`,
        error.message
      );

      results.push({
        userId: profile.id,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

module.exports = {
  startMorningRoutine,
  startNightRoutine,
};