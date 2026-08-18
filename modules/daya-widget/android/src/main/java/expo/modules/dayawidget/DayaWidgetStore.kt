package expo.modules.dayawidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import org.json.JSONArray

data class DayaWidgetReminder(
  val title: String,
  val timestamp: Long
)

object DayaWidgetStore {
  private const val PREFS_NAME = "daya_widget_preferences"
  private const val KEY_REMINDERS = "reminders_json"

  const val ACTION_REFRESH =
    "expo.modules.dayawidget.ACTION_REFRESH_WIDGET"

  private const val REQUEST_CODE = 44021

  fun saveReminders(
    context: Context,
    remindersJson: String
  ): Boolean {
    return context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_REMINDERS, remindersJson)
      .commit()
  }

  fun clear(context: Context): Boolean {
    cancelScheduledRefresh(context)

    return context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .remove(KEY_REMINDERS)
      .commit()
  }

  fun getUpcomingReminders(
    context: Context,
    now: Long = System.currentTimeMillis()
  ): List<DayaWidgetReminder> {
    val raw = context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(KEY_REMINDERS, null)
      ?: return emptyList()

    return try {
      val array = JSONArray(raw)

      buildList {
        for (index in 0 until array.length()) {
          val item = array.optJSONObject(index) ?: continue
          val title = item.optString("title").trim()
          val timestamp = item.optLong("timestamp", 0L)

          if (timestamp > now) {
            add(
              DayaWidgetReminder(
                title = title.ifBlank { "Rappel Daya" },
                timestamp = timestamp
              )
            )
          }
        }
      }.sortedBy { it.timestamp }
    } catch (_: Exception) {
      emptyList()
    }
  }

  fun scheduleNextTransition(context: Context) {
    cancelScheduledRefresh(context)

    val next = getUpcomingReminders(context).firstOrNull()
      ?: return

    val alarmManager =
      context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    val pendingIntent = buildRefreshPendingIntent(context)

    /*
     * On réveille le widget juste après l'heure du rappel actuel.
     * setAndAllowWhileIdle ne demande pas la permission spéciale
     * des alarmes exactes et reste compatible avec Doze.
     */
    val triggerAt = next.timestamp + 1_000L

    alarmManager.setAndAllowWhileIdle(
      AlarmManager.RTC_WAKEUP,
      triggerAt,
      pendingIntent
    )
  }

  private fun cancelScheduledRefresh(context: Context) {
    val alarmManager =
      context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    alarmManager.cancel(
      buildRefreshPendingIntent(context)
    )
  }

  private fun buildRefreshPendingIntent(
    context: Context
  ): PendingIntent {
    val intent = Intent(
      context,
      DayaAppWidgetReceiver::class.java
    ).apply {
      action = ACTION_REFRESH
    }

    return PendingIntent.getBroadcast(
      context,
      REQUEST_CODE,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or
        PendingIntent.FLAG_IMMUTABLE
    )
  }
}
