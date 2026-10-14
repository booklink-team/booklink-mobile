package ru.booklink.mobile

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      useDevSupport = BuildConfig.DEBUG,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        }
    )
  }

  override fun onCreate() {
    super.onCreate()
    // Booklink network policy: a changing request must never be replayed.
    OkHttpClientProvider.setOkHttpClientFactory(OkHttpClientFactory {
      OkHttpClientProvider.createClientBuilder()
        // With transport retries disabled, don't reuse a connection the server
        // may have closed while the app was idle. Changing requests stay one-shot.
        .connectionPool(okhttp3.ConnectionPool(0, 1L, java.util.concurrent.TimeUnit.SECONDS))
        .retryOnConnectionFailure(false)
        .followRedirects(false)
        .followSslRedirects(false)
        .addInterceptor { chain ->
          val request = chain.request()
          val guarded = if (request.method == "GET" || request.method == "HEAD") request else {
            val originalBody = request.body
            request.newBuilder().method(request.method, object : okhttp3.RequestBody() {
              override fun contentType(): okhttp3.MediaType? = originalBody?.contentType()
              override fun contentLength(): Long = originalBody?.contentLength() ?: 0L
              override fun isOneShot(): Boolean = true
              override fun writeTo(sink: okio.BufferedSink) { originalBody?.writeTo(sink) }
            }).build()
          }
          chain.proceed(guarded)
        }
        .build()
    })
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
