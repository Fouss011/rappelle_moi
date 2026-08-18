package expo.modules.dayawidget

import androidx.glance.appwidget.updateAll
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DayaWidgetModule : Module() {

  override fun definition() = ModuleDefinition {

    Name("DayaWidget")

    AsyncFunction("syncReminders") Coroutine {
      remindersJson: String ->

      val context = appContext.reactContext
        ?: return@Coroutine false

      val saved = DayaWidgetStore.saveReminders(
        context,
        remindersJson
      )

      if (!saved) {
        return@Coroutine false
      }

      DayaAppWidget().updateAll(context)

      DayaWidgetStore.scheduleNextTransition(
        context
      )

      true
    }

    AsyncFunction("clearReminders") Coroutine { ->

      val context = appContext.reactContext
        ?: return@Coroutine false

      val cleared = DayaWidgetStore.clear(
        context
      )

      if (!cleared) {
        return@Coroutine false
      }

      DayaAppWidget().updateAll(context)

      true
    }
  }
}