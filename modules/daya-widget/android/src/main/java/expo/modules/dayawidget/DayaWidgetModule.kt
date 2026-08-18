package expo.modules.dayawidget

import android.content.Context
import androidx.glance.appwidget.updateAll
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class DayaWidgetModule : Module() {

  override fun definition() = ModuleDefinition {

    Name("DayaWidget")

    AsyncFunction("setNextReminder") {
      title: String,
      date: String ->

      val context = appContext.reactContext
        ?: return@AsyncFunction false

      val preferences = context.getSharedPreferences(
        "daya_widget_preferences",
        Context.MODE_PRIVATE
      )

      preferences
        .edit()
        .putString("next_reminder_title", title)
        .putString("next_reminder_date", date)
        .apply()

      /*
       * Glance updateAll() est suspend.
       * On le lance explicitement dans une coroutine.
       */
      CoroutineScope(Dispatchers.Main).launch {
        try {
          DayaAppWidget().updateAll(context)
        } catch (error: Exception) {
          error.printStackTrace()
        }
      }

      return@AsyncFunction true
    }

    AsyncFunction("clearNextReminder") {

      val context = appContext.reactContext
        ?: return@AsyncFunction false

      val preferences = context.getSharedPreferences(
        "daya_widget_preferences",
        Context.MODE_PRIVATE
      )

      preferences
        .edit()
        .remove("next_reminder_title")
        .remove("next_reminder_date")
        .apply()

      CoroutineScope(Dispatchers.Main).launch {
        try {
          DayaAppWidget().updateAll(context)
        } catch (error: Exception) {
          error.printStackTrace()
        }
      }

      return@AsyncFunction true
    }
  }
}