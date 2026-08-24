package sg.kaki.companion

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray
import org.json.JSONObject

class KakiAccessibilityService : AccessibilityService() {
    override fun onServiceConnected() {
        CompanionBridge.accessibility = this
    }

    override fun onDestroy() {
        CompanionBridge.accessibility = null
        super.onDestroy()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit
    override fun onInterrupt() = Unit

    fun tree(): JSONObject = nodeJson(rootInActiveWindow)

    fun tap(x: Float, y: Float, durationMs: Long = 80): Boolean {
        val path = Path().apply { moveTo(x, y) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, durationMs))
            .build()
        return dispatchGesture(gesture, null, null)
    }

    fun swipe(x1: Float, y1: Float, x2: Float, y2: Float, durationMs: Long = 350): Boolean {
        val path = Path().apply { moveTo(x1, y1); lineTo(x2, y2) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, durationMs))
            .build()
        return dispatchGesture(gesture, null, null)
    }

    private fun nodeJson(node: AccessibilityNodeInfo?): JSONObject {
        if (node == null) return JSONObject().put("missing", true)
        val bounds = android.graphics.Rect().also(node::getBoundsInScreen)
        val children = JSONArray()
        for (index in 0 until node.childCount) children.put(nodeJson(node.getChild(index)))
        return JSONObject()
            .put("text", node.text?.toString())
            .put("description", node.contentDescription?.toString())
            .put("viewId", node.viewIdResourceName)
            .put("clickable", node.isClickable)
            .put("bounds", JSONArray(listOf(bounds.left, bounds.top, bounds.right, bounds.bottom)))
            .put("children", children)
    }
}
