# Booklink — mobile#1

React Native 0.83.10, Expo 55, TypeScript. Android 10+.
Первый этап: базовая навигация, проверка API и сохранение адреса сервера.

## Запуск на Windows

Нужны Node.js 24, Android Studio и интернет. В SDK Manager установите Platform 36,
Build-Tools 36.0.0, Platform-Tools, NDK 27.1.12297006 и CMake 3.22.1, примите лицензии.
Запустите эмулятор Android 10+. Пути ниже замените своими:

```powershell
cd D:\biblioteka\booklink-mobile
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'D:\Android\Sdk'
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
adb devices
npm ci
npm run typecheck
npm run android
```

Если нужен выбор устройства: `npm run android -- --device`.
Для повторного запуска установленной debug-версии: `npm start`, затем откройте приложение.
Проверен JDK 21; необходимый плагинам JDK 17 Gradle загружает автоматически.
Локальный debug-ключ создаётся автоматически и исключён из Git.
Папка `android/` уже подготовлена; `expo prebuild --clean` для запуска не нужен.

## Сервер

По умолчанию: `http://213.226.112.230:6776/api`.
Адрес меняется в «Настройки сервера» и сохраняется между запусками.
«Проверить подключение» отправляет GET `/api/books?page=1` без пароля и JWT.
Ответ **401** подтверждает связь с API; для получения книг требуется вход из следующего этапа.
Для локального backend в эмуляторе: `http://10.0.2.2:5232/api`.
Сервер команды пока использует HTTP; HTTPS-адрес по ТЗ должен предоставить его владелец.

## APK без Metro

После настройки окружения выше, остановив Metro (serial возьмите из `adb devices`):

```powershell
npm run apk
adb -s <serial> install -r .\artifacts\booklink-1.0.1.apk
```

Откройте Booklink на устройстве. Подпись локальная debug; ключи, `.env` и APK не добавляйте в Git.

14.10.2026: проверены свежая копия, TypeScript, debug/release-сборки и запуск на Android 14,
ответ реального API, навигация и сохранение адреса. Android 10 и физический телефон не проверены.
