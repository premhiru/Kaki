package sg.kaki.companion

import android.app.Application

class KakiApplication : Application() {
    private lateinit var socketServer: LocalSocketServer

    override fun onCreate() {
        super.onCreate()
        socketServer = LocalSocketServer()
        socketServer.start()
    }

    override fun onTerminate() {
        socketServer.stop()
        super.onTerminate()
    }
}
