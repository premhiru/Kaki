# Kaki Android companion

The companion is optional but preferred over raw UIAutomator. It exposes the accessibility tree, gesture injection, global Back/Home, and recent notifications over a WebSocket bound to `127.0.0.1:8765`; it is not reachable from Wi-Fi.

## Pair

1. Build/install the debug APK with Android Studio or `./gradlew :app:installDebug`.
2. On the dedicated assistant phone, enable **Kaki Companion** under Accessibility and Notification access.
3. Keep the phone on USB or paired wireless ADB, then run `adb -s <serial> forward tcp:8765 tcp:8765` on the Kaki host.
4. Query `ws://127.0.0.1:8765` with `{"action":"health"}`. A healthy response has `{"ok":true,"accessibility":true}`.

Use a dedicated Android device and assistant-owned app accounts with a capped wallet float. Do not install the companion on a household member's everyday phone.
