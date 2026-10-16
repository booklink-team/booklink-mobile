param([string]$Architectures = 'arm64-v8a,x86_64')
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
Push-Location $projectPath
try {
    if (-not $env:JAVA_HOME) { $env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr' }
    if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = 'D:\Android\Sdk' }
    $env:Path = "$env:JAVA_HOME\bin;$env:Path"
    $env:CI = '1'
    $env:NODE_ENV = 'production'
    $env:EXPO_NO_GIT_STATUS = '1'
    npm run typecheck
    if ($LASTEXITCODE -ne 0) { throw 'TypeScript failed' }
    if (-not (Test-Path android/gradlew.bat)) {
        npx expo prebuild --platform android --no-install
        if ($LASTEXITCODE -ne 0) { throw 'Prebuild failed' }
    }
    # Expo 55 generates Gradle 9; RN 0.83 toolchain resolver needs Gradle 8.
    $wrapper = Join-Path $projectPath 'android/gradle/wrapper/gradle-wrapper.properties'
    $properties = Get-Content -LiteralPath $wrapper -Raw
    $properties = $properties -replace '(?m)^distributionUrl=.*', 'distributionUrl=https\://services.gradle.org/distributions/gradle-8.14.3-bin.zip'
    Set-Content -LiteralPath $wrapper -Value $properties -Encoding ascii
    if (-not (Test-Path android/app/debug.keystore)) {
        & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -keystore android/app/debug.keystore -storepass android -alias androiddebugkey -keypass android -dname 'CN=Android Debug,O=Android,C=US' -keyalg RSA -keysize 2048 -validity 10000
        if ($LASTEXITCODE -ne 0) { throw 'Local demo signing failed' }
    }
    Push-Location android
    try {
        .\gradlew.bat assembleRelease "-PreactNativeArchitectures=$Architectures" --console=plain --max-workers=4
        if ($LASTEXITCODE -ne 0) { throw 'Gradle failed' }
    } finally { Pop-Location }
    New-Item -ItemType Directory -Force artifacts | Out-Null
    $booklinkVersion = (Get-Content -LiteralPath package.json -Raw | ConvertFrom-Json).version
    $booklinkApk = "artifacts/booklink-$booklinkVersion.apk"
    Copy-Item android/app/build/outputs/apk/release/app-release.apk $booklinkApk
    Get-Item $booklinkApk | Select-Object FullName,Length
} finally { Pop-Location }
