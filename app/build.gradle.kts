plugins {
    id("com.android.application")
    id("com.chaquo.python")
    id("org.jetbrains.kotlin.android")
}

val spotifyClientId: String = providers.gradleProperty("SPOTIFY_CLIENT_ID")
    .orElse(providers.environmentVariable("SPOTIFY_CLIENT_ID"))
    .orElse("")
    .get()

val spotifyClientSecret: String = providers.gradleProperty("SPOTIFY_CLIENT_SECRET")
    .orElse(providers.environmentVariable("SPOTIFY_CLIENT_SECRET"))
    .orElse("")
    .get()

val buildPythonPath: String = providers.gradleProperty("BUILD_PYTHON")
    .orElse(providers.environmentVariable("BUILD_PYTHON"))
    .orElse("")
    .get()

val escapedSpotifyId = spotifyClientId.replace("\\", "\\\\").replace("\"", "\\\"")
val escapedSpotifySecret = spotifyClientSecret.replace("\\", "\\\\").replace("\"", "\\\"")

android {
    namespace = "com.reclip.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.reclip.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        ndk {
            abiFilters += listOf("arm64-v8a", "x86_64")
        }

        buildConfigField("String", "SPOTIFY_CLIENT_ID", "\"$escapedSpotifyId\"")
        buildConfigField("String", "SPOTIFY_CLIENT_SECRET", "\"$escapedSpotifySecret\"")
    }

    packaging {
        jniLibs {
            useLegacyPackaging = true
        }
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

    sourceSets {
        getByName("main") {
            jniLibs.srcDirs("src/main/jniLibs")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }
}

chaquopy {
    defaultConfig {
        version = "3.11"
        if (buildPythonPath.isNotEmpty()) {
            buildPython(buildPythonPath)
        }
        pip {
            install("yt-dlp")
        }
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.webkit:webkit:1.10.0")
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("com.google.code.gson:gson:2.10.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("com.revenuecat.purchases:purchases:10.6.0")
    implementation("com.revenuecat.purchases:purchases-ui:10.6.0")
}
