$ErrorActionPreference = 'Stop'
$booklinkProject = Split-Path -Parent $PSScriptRoot
if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath "$env:JAVA_HOME\bin\keytool.exe")) { throw 'Set JAVA_HOME to JDK 17 or newer (see README).' }
if (-not $env:ANDROID_HOME -or -not (Test-Path -LiteralPath "$env:ANDROID_HOME\platform-tools\adb.exe")) { throw 'Set ANDROID_HOME to the Android SDK directory (see README).' }
$booklinkWrapper = Join-Path $booklinkProject 'android\gradle\wrapper\gradle-wrapper.properties'
$booklinkProperties = Get-Content -LiteralPath $booklinkWrapper -Raw
$booklinkProperties = $booklinkProperties -replace '(?m)^distributionUrl=.*', 'distributionUrl=https\://services.gradle.org/distributions/gradle-8.14.3-bin.zip'
[System.IO.File]::WriteAllText($booklinkWrapper, $booklinkProperties, [System.Text.Encoding]::ASCII)
$booklinkKey = Join-Path $booklinkProject 'android\app\debug.keystore'
if (-not (Test-Path -LiteralPath $booklinkKey)) {
    & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -keystore $booklinkKey -storepass android -alias androiddebugkey -keypass android -dname 'CN=Android Debug,O=Android,C=US' -keyalg RSA -keysize 2048 -validity 10000
    if ($LASTEXITCODE -ne 0) { throw 'Could not create local debug keystore.' }
}
