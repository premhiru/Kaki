package sg.kaki.companion

import java.net.InetSocketAddress
import org.java_websocket.WebSocket
import org.java_websocket.handshake.ClientHandshake
import org.java_websocket.server.WebSocketServer
import org.json.JSONObject

class LocalSocketServer : WebSocketServer(InetSocketAddress("127.0.0.1", 8765)) {
    override fun onOpen(connection: WebSocket, handshake: ClientHandshake) = Unit
    override fun onClose(connection: WebSocket, code: Int, reason: String, remote: Boolean) = Unit
    override fun onError(connection: WebSocket?, error: Exception) = Unit
    override fun onStart() = Unit

    override fun onMessage(connection: WebSocket, message: String) {
        val response = runCatching { dispatch(JSONObject(message)) }
            .getOrElse { JSONObject().put("ok", false).put("error", it.message) }
        connection.send(response.toString())
    }

    private fun dispatch(request: JSONObject): JSONObject {
        val service = CompanionBridge.accessibility
        return when (request.getString("action")) {
            "health" -> JSONObject().put("ok", true).put("accessibility", service != null)
            "tree" -> JSONObject().put("ok", service != null).put("tree", service?.tree())
            "notifications" -> JSONObject().put("ok", true).put("notifications", CompanionBridge.notifications())
            "tap" -> JSONObject().put("ok", service?.tap(request.getDouble("x").toFloat(), request.getDouble("y").toFloat()) == true)
            "long_press" -> JSONObject().put("ok", service?.tap(request.getDouble("x").toFloat(), request.getDouble("y").toFloat(), 800) == true)
            "swipe" -> JSONObject().put("ok", service?.swipe(request.getDouble("x1").toFloat(), request.getDouble("y1").toFloat(), request.getDouble("x2").toFloat(), request.getDouble("y2").toFloat()) == true)
            "home" -> JSONObject().put("ok", service?.performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_HOME) == true)
            "back" -> JSONObject().put("ok", service?.performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK) == true)
            else -> throw IllegalArgumentException("Unknown action")
        }
    }
}
