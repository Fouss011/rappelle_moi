package expo.modules.dayawidget

import androidx.glance.appwidget.updateAll
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async

class DayaWidgetModule : Module() {

  override fun definition() = ModuleDefinition {

    Name("DayaWidget")

    AsyncFunction("syncReminders") {
      remindersJson: String ->

      val context = appContext.reactContext
        ?: return@AsyncFunction false

      val saved =
        DayaWidgetStore.saveReminders(
          context,
          remindersJson
        )

      if (!saved) {
        return@AsyncFunction false
      }

      CoroutineScope(Dispatchers.Default)
        .async {
          DayaAppWidget().updateAll(context)
        }
        .await()

      DayaWidgetStore
        .scheduleNextTransition(context)

      true
    }

    AsyncFunction("clearReminders") {

      val context = appContext.reactContext
        ?: return@AsyncFunction false

      val cleared =
        DayaWidgetStore.clear(context)

      if (!cleared) {
        return@AsyncFunction false
      }

      CoroutineScope(Dispatchers.Default)
        .async {
          DayaAppWidget().updateAll(context)
        }
        .await()

      true
    }
  }
}