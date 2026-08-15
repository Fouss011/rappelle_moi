package expo.modules.dayawidget

import android.content.Context
import androidx.glance.appwidget.updateAll
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DayaWidgetModule : Module() {

  override fun definition() = ModuleDefinition {

    Name("DayaWidget")

    AsyncFunction("setNextReminder") Coroutine {
      title: String,
      date: String ->

      val context = appContext.reactContext
        ?: return@Coroutine false

      val preferences = context.getSharedPreferences(
        "daya_widget_preferences",
        Context.MODE_PRIVATE
      )

      preferences
        .edit()
        .putString("next_reminder_title", title)
        .putString("next_reminder_date", date)
        .apply()

      DayaAppWidget().updateAll(context)

      return@Coroutine true
    }

    AsyncFunction("clearNextReminder") Coroutine {

      val context = appContext.reactContext
        ?: return@Coroutine false

      val preferences = context.getSharedPreferences(
        "daya_widget_preferences",
        Context.MODE_PRIVATE
      )

      preferences
        .edit()
        .remove("next_reminder_title")
        .remove("next_reminder_date")
        .apply()

      DayaAppWidget().updateAll(context)

      return@Coroutine true
    }
  }
}