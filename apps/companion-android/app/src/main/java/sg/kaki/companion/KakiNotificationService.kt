package sg.kaki.companion

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject

class KakiNotificationService : NotificationListenerService() {
    override fun onNotificationPosted(notification: StatusBarNotification) {
        val extras = notification.notification.extras
        CompanionBridge.pushNotification(
            JSONObject()
                .put("package", notification.packageName)
                .put("postedAt", notification.postTime)
                .put("title", extras.getCharSequence("android.title")?.toString())
                .put("text", extras.getCharSequence("android.text")?.toString())
                .toString()
        )
    }
}
