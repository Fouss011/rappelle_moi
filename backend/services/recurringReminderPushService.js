const supabase = require('../config/supabase');
const {
  isValidExpoPushToken,
  sendExpoPushNotification,
} = require('./pushService');

let processing = false;

function getLocalClockParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const values = {};

  formatter.formatToParts(date).forEach((part) => {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  });

  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function isDueNow(item, now = new Date()) {
  const local = getLocalClockParts(
    now,
    item.timezone
  );
  const targetMinute =
    Number(item.hour) * 60 + Number(item.minute);
  const currentMinute =
    local.hour * 60 + local.minute;

  return {
    due:
      currentMinute >= targetMinute &&
      currentMinute <= targetMinute + 2 &&
      item.last_sent_local_date !== local.dateKey,
    localDateKey: local.dateKey,
  };
}

async function processRecurringReminders() {
  if (processing) {
    return {
      skipped: true,
      found: 0,
      sent: 0,
      failed: 0,
    };
  }

  processing = true;

  try {
    const { data: reminders, error } = await supabase
      .from('recurring_reminders')
      .select(`
        id,
        user_id,
        title,
        text,
        hour,
        minute,
        timezone,
        enabled,
        last_sent_local_date
      `)
      .eq('enabled', true);

    if (error) {
      throw new Error(error.message);
    }

    const due = (reminders ?? [])
      .map((item) => ({
        item,
        timing: isDueNow(item),
      }))
      .filter(({ timing }) => timing.due);

    if (due.length === 0) {
      return {
        skipped: false,
        found: 0,
        sent: 0,
        failed: 0,
      };
    }

    const userIds = [
      ...new Set(due.map(({ item }) => item.user_id)),
    ];

    const { data: profiles, error: profileError } =
      await supabase
        .from('profiles')
        .select('id, expo_push_token, push_enabled')
        .in('id', userIds);

    if (profileError) {
      throw new Error(profileError.message);
    }

    const profileById = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        profile,
      ])
    );

    let sent = 0;
    let failed = 0;

    for (const { item, timing } of due) {
      const profile = profileById.get(item.user_id);

      if (
        !profile?.push_enabled ||
        !isValidExpoPushToken(profile.expo_push_token)
      ) {
        failed += 1;
        continue;
      }

      try {
        await sendExpoPushNotification({
          token: profile.expo_push_token,
          title: 'Daya',
          body: `Rappel quotidien : ${item.text}`,
          data: {
            kind: 'recurring_reminder_server_v1',
            recurringReminderId: item.id,
          },
        });

        const { error: updateError } = await supabase
          .from('recurring_reminders')
          .update({
            last_sent_local_date: timing.localDateKey,
            last_sent_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        sent += 1;
      } catch (sendError) {
        failed += 1;
        console.error(
          `Erreur rappel récurrent ${item.id} :`,
          sendError.message
        );
      }
    }

    return {
      skipped: false,
      found: due.length,
      sent,
      failed,
    };
  } finally {
    processing = false;
  }
}

module.exports = {
  processRecurringReminders,
};
