package expo.modules.dayawidget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

class DayaAppWidgetReceiver : GlanceAppWidgetReceiver() {

  override val glanceAppWidget: GlanceAppWidget
    get() = DayaAppWidget()
}