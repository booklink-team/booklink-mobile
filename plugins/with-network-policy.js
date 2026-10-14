const { withMainApplication, withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

// React Native uses OkHttp for fetch. Disable its transparent transport retries,
// including after the server applies a POST but closes the connection.
module.exports = function withNetworkPolicy(config) {
  config = withAndroidManifest(config, result => {
    const app = result.modResults.manifest.application[0].$;
    app["android:usesCleartextTraffic"] = "false";
    app["android:networkSecurityConfig"] = "@xml/booklink_network_security";
    return result;
  });
  config = withDangerousMod(config, ["android", result => {
    const dir = path.join(result.modRequest.platformProjectRoot, "app/src/main/res/xml");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "booklink_network_security.xml"), `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">localhost</domain>
    <domain includeSubdomains="false">127.0.0.1</domain>
    <domain includeSubdomains="false">10.0.2.2</domain>
    <domain includeSubdomains="false">::1</domain>
  </domain-config>
</network-security-config>
`);
    return result;
  }]);
  return withMainApplication(config, (result) => {
    let code = result.modResults.contents;
    if (
      !code.includes(
        "import com.facebook.react.modules.network.OkHttpClientFactory",
      )
    ) {
      code = code.replace(
        "import com.facebook.react.PackageList",
        "import com.facebook.react.modules.network.OkHttpClientFactory\nimport com.facebook.react.modules.network.OkHttpClientProvider\nimport com.facebook.react.PackageList",
      );
    }
    if (code.includes("// Booklink network policy")) {
      code = code.replace(
        /    \/\/ Booklink network policy[\s\S]*?(?=    DefaultNewArchitectureEntryPoint)/,
        "",
      );
    }
    code = code.replace(
      "super.onCreate()",
      `super.onCreate()
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
    })`,
    );
    result.modResults.contents = code;
    return result;
  });
};
