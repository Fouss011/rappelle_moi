package expo.modules.dayawidget

import android.content.Context
import android.content.Intent
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class DayaAppWidgetReceiver : GlanceAppWidgetReceiver() {

  override val glanceAppWidget: GlanceAppWidget
    get() = DayaAppWidget()

  override fun onReceive(
    context: Context,
    intent: Intent
  ) {
    super.onReceive(context, intent)

    if (
      intent.action != DayaWidgetStore.ACTION_REFRESH
    ) {
      return
    }

    val pendingResult = goAsync()

    CoroutineScope(Dispatchers.Default).launch {
      try {
        DayaAppWidget().updateAll(context)
        DayaWidgetStore.scheduleNextTransition(context)
      } finally {
        pendingResult.finish()
      }
    }
  }
}
