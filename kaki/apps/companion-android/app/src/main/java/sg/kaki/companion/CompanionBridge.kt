package sg.kaki.companion

import org.json.JSONArray

object CompanionBridge {
    @Volatile var accessibility: KakiAccessibilityService? = null
    private val notificationBuffer = ArrayDeque<String>()

    @Synchronized fun pushNotification(value: String) {
        notificationBuffer.addLast(value)
        while (notificationBuffer.size > 50) notificationBuffer.removeFirst()
    }

    @Synchronized fun notifications(): JSONArray = JSONArray(notificationBuffer.toList())
}
