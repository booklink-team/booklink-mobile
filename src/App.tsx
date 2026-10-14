import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Keyboard, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { checkConnection } from './api';
import { SessionProvider, useSession } from './session';

export default function App() { return <SafeAreaProvider><SessionProvider><Workspace /></SessionProvider></SafeAreaProvider>; }
function Workspace() {
  const { server, session, ready, busy, notice, error, restoreError, controller } = useSession();
  const [settings, setSettings] = useState(false);
  const [draft, setDraft] = useState(server);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const probeLock = useRef(false);
  const disabled = busy || checking || !ready;
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (settings) { if (!disabled) { setSettings(false); setMessage(''); } return true; }
      return false;
    });
    return () => listener.remove();
  }, [settings, disabled]);
  function openSettings() { setDraft(server); setMessage(''); setSettings(true); }
  async function probe() {
    if (probeLock.current || busy) return;
    probeLock.current = true; setChecking(true); setMessage(''); Keyboard.dismiss();
    try { setMessage(await checkConnection(server)); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Ответ API не получен.'); }
    finally { probeLock.current = false; setChecking(false); }
  }
  return <SafeAreaView style={styles.root}><StatusBar barStyle="dark-content" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Image source={require('../assets/logo.png')} accessibilityLabel="Логотип Booklink" style={{ width: 64, height: 64 }} />
      <Text style={styles.title}>{settings ? 'Настройки сервера' : session ? (session.user.role === 'Librarian' ? 'Кабинет библиотекаря' : 'Кабинет студента') : 'Вход в Booklink'}</Text>
      {!ready ? <ActivityIndicator /> : settings ? <>
        <Text style={styles.text}>Адрес API с /api. Для удалённого сервера требуется HTTPS.</Text>
        <TextInput accessibilityLabel="Адрес сервера" value={draft} onChangeText={setDraft} editable={!disabled} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={styles.input} />
        {!!session && <Text style={styles.text}>При смене сервера потребуется повторный вход.</Text>}
        <Button title="Сохранить адрес" disabled={disabled} onPress={() => { Keyboard.dismiss(); void controller.setServer(draft); }} />
        <Button title="Назад" disabled={disabled} onPress={() => { setSettings(false); setMessage(''); }} />
      </> : restoreError ? <>
        <Text style={styles.text}>Не удалось проверить сохранённый сеанс.</Text>
        <Button title="Повторить" disabled={disabled} onPress={() => void controller.restore()} />
        <Button title="Выйти из аккаунта" disabled={disabled} onPress={() => void controller.logout()} />
        <Button title="Настройки сервера" disabled={disabled} onPress={openSettings} />
      </> : session ? <>
        <Text style={styles.text}>{session.user.name}</Text>
        <Text style={styles.text}>Логин: {session.user.login}</Text>
        <Text style={styles.text}>Роль: {session.user.role === 'Librarian' ? 'Библиотекарь' : 'Студент'}</Text>
        <Button title="Проверить сеанс" disabled={disabled} onPress={() => void controller.refresh()} />
        <Button title="Настройки сервера" disabled={disabled} onPress={openSettings} />
        <Button title="Выйти из аккаунта" disabled={disabled} onPress={() => { setMessage(''); void controller.logout(); }} />
      </> : <Login disabled={disabled} />}
      {!settings && !session && !restoreError && ready && <>
        <Text selectable style={styles.text}>{server || 'Укажите адрес API в настройках сервера.'}</Text>
        <Button title="Проверить подключение" disabled={disabled} onPress={() => void probe()} />
        <Button title="Настройки сервера" disabled={disabled} onPress={openSettings} />
      </>}
      {(busy || checking) && ready && <ActivityIndicator accessibilityLabel="Загрузка" />}
      {!!error && <Text accessibilityRole="alert" style={[styles.text, { color: '#C62828' }]}>{error}</Text>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={styles.text}>{notice}</Text>}
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text>}
    </ScrollView></SafeAreaView>;
}
function Login({ disabled }: { disabled: boolean }) {
  const { controller } = useSession();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  async function submit() {
    if (disabled || !login.trim() || !password) return;
    Keyboard.dismiss();
    try { await controller.login(login, password); }
    finally { setPassword(''); }
  }
  return <>
    <TextInput accessibilityLabel="Логин" placeholder="Логин" value={login} onChangeText={setLogin} editable={!disabled} autoCapitalize="none" autoCorrect={false} autoComplete="username" style={styles.input} />
    <TextInput accessibilityLabel="Пароль" placeholder="Пароль" value={password} onChangeText={setPassword} editable={!disabled} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="off" returnKeyType="done" onSubmitEditing={() => void submit()} style={styles.input} />
    <Button title={visible ? 'Скрыть пароль' : 'Показать пароль'} disabled={disabled} onPress={() => setVisible(value => !value)} />
    <Button title="Войти" disabled={disabled || !login.trim() || !password} onPress={() => void submit()} />
  </>;
}
function Button({ title, disabled, onPress }: { title: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, disabled && { opacity: 0.5 }]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' }, content: { padding: 24, gap: 18 },
  title: { fontSize: 26, fontWeight: '700', color: '#15171A' }, text: { fontSize: 16, color: '#15171A' },
  input: { borderWidth: 1, borderColor: '#5F6672', borderRadius: 12, padding: 14, fontSize: 16, color: '#15171A' },
  button: { backgroundColor: '#C7F32C', padding: 16, borderRadius: 12 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#15171A', textAlign: 'center' },
});
