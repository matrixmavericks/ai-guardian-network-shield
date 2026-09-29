import java.util.Properties

plugins {
    id("com.android.application")
}

// Upload key: kept outside the repo. Point REFYN_KEYSTORE_PROPERTIES at a
// keystore.properties file, or keep it at ~/.refyn-android/keystore.properties.
val keystoreFile = file(
    System.getenv("REFYN_KEYSTORE_PROPERTIES")
        ?: "${System.getProperty("user.home")}/.refyn-android/keystore.properties"
)
val keystore = Properties().apply { if (keystoreFile.exists()) keystoreFile.inputStream().use { load(it) } }

android {
    namespace = "us.refyntech.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "us.refyntech.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        if (keystore.isNotEmpty()) {
            create("upload") {
                storeFile = file(keystore.getProperty("storeFile"))
                storePassword = keystore.getProperty("storePassword")
                keyAlias = keystore.getProperty("keyAlias")
                keyPassword = keystore.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (keystore.isNotEmpty()) signingConfig = signingConfigs.getByName("upload")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.7.3")
}
