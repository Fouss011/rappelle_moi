package expo.modules.dayawidget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.glance.Button
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class DayaAppWidget : GlanceAppWidget() {

  override suspend fun provideGlance(
    context: Context,
    id: GlanceId
  ) {
    provideContent {
      DayaWidgetContent(context)
    }
  }
}

@Composable
private fun DayaWidgetContent(context: Context) {

  val preferences = context.getSharedPreferences(
    "daya_widget_preferences",
    Context.MODE_PRIVATE
  )

  val title = preferences.getString(
    "next_reminder_title",
    null
  )

  val date = preferences.getString(
    "next_reminder_date",
    null
  )

  val launchIntent =
    context.packageManager.getLaunchIntentForPackage(
      context.packageName
    )

  Column(
    modifier = GlanceModifier
      .fillMaxSize()
      .padding(16.dp)
  ) {

    Text(
      text = "DAYA",
      style = TextStyle(
        color = ColorProvider(Color.Black),
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold
      )
    )

    Spacer(
      modifier = GlanceModifier.height(10.dp)
    )

    Text(
      text = "PROCHAIN RAPPEL",
      style = TextStyle(
        color = ColorProvider(Color.Gray),
        fontSize = 12.sp
      )
    )

    Spacer(
      modifier = GlanceModifier.height(6.dp)
    )

    Text(
      text = title ?: "Aucun rappel à venir",
      style = TextStyle(
        color = ColorProvider(Color.Black),
        fontSize = 16.sp,
        fontWeight = FontWeight.Bold
      )
    )

    if (!date.isNullOrBlank()) {
      Spacer(
        modifier = GlanceModifier.height(4.dp)
      )

      Text(
        text = date,
        style = TextStyle(
          color = ColorProvider(Color.Gray),
          fontSize = 13.sp
        )
      )
    }

    Spacer(
      modifier = GlanceModifier.height(12.dp)
    )

    if (launchIntent != null) {
      Button(
        text = "OUVRIR DAYA",
        onClick = actionStartActivity(launchIntent)
      )
    }
  }
}