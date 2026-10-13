param([string]$Architectures = 'arm64-v8a,x86_64')
$ErrorActionPreference = 'Stop'
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    & "$PSScriptRoot\prepare-android.ps1"
    $env:Path = "$env:JAVA_HOME\bin;$env:Path"
    $env:CI = '1'
    $env:NODE_ENV = 'production'
    npm run typecheck
    if ($LASTEXITCODE -ne 0) { throw 'TypeScript failed' }
    Push-Location android
    try {
        .\gradlew.bat assembleRelease "-PreactNativeArchitectures=$Architectures" --console=plain --max-workers=2
        if ($LASTEXITCODE -ne 0) { throw 'Gradle failed' }
    } finally { Pop-Location }
    New-Item -ItemType Directory -Force artifacts | Out-Null
    $booklinkVersion = (Get-Content -LiteralPath package.json -Raw | ConvertFrom-Json).version
    Copy-Item android/app/build/outputs/apk/release/app-release.apk "artifacts/booklink-$booklinkVersion.apk"
} finally { Pop-Location }
