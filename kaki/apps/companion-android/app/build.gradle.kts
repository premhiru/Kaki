plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "sg.kaki.companion"
    compileSdk = 35

    defaultConfig {
        applicationId = "sg.kaki.companion"
        minSdk = 29
        targetSdk = 35
        versionCode = 1
        versionName = "0.4.0"
    }

    buildFeatures { buildConfig = false }

    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("org.java-websocket:Java-WebSocket:1.6.0")
}
