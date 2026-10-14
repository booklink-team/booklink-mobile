# Booklink — вход и выход (#2)

React Native 0.83.10, Expo 55, TypeScript. Android 10+.
Вход и выход через API, сохранение сеанса и экран для каждой роли.

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

В «Настройки сервера» укажите HTTPS-адрес API с `/api`. Адрес сохраняется между запусками.
Для локального backend в эмуляторе: `http://10.0.2.2:5232/api`.
Прежний публичный HTTP-адрес для входа не подходит: нужен HTTPS-адрес от владельца сервера.
Логин и пароль получите у библиотеки.

После входа открывается экран студента или библиотекаря. Сеанс сохраняется в SecureStore,
пароль не сохраняется. Выход и смена сервера удаляют сеанс; после его истечения нужен повторный вход.

## APK без Metro

После настройки окружения выше, остановив Metro (serial возьмите из `adb devices`):

```powershell
npm run apk
adb -s <serial> install -r .\artifacts\booklink-1.0.1.apk
```

Откройте Booklink на устройстве. Подпись локальная debug; ключи, `.env` и APK не добавляйте в Git.
