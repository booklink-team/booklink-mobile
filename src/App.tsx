import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_API_URL, normalizeApiUrl, checkConnection } from './api';
const SERVER_KEY = 'booklink.s1.server';
export default function App() { return <SafeAreaProvider><Workspace /></SafeAreaProvider>; }
function Workspace() {
  const [page, setPage] = useState<'home' | 'settings'>('home');
  const [server, setServer] = useState(DEFAULT_API_URL);
  const [draft, setDraft] = useState(DEFAULT_API_URL);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(SERVER_KEY).then(value => {
      if (value) { const url = normalizeApiUrl(value); setServer(url); setDraft(url); }
    }).catch(() => setMessage('Не удалось прочитать настройки. Сохраните адрес заново.')).finally(() => setReady(true));
  }, []);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page === 'settings') { if (!lock.current) setPage('home'); return true; }
      return false;
    });
    return () => listener.remove();
  }, [page]);
  async function perform(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try { await action(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось выполнить действие.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const button = (title: string, onPress: () => void) => <Pressable accessibilityRole="button" disabled={busy || !ready} onPress={onPress} style={[styles.button, (busy || !ready) && { opacity: 0.5 }]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
  return <SafeAreaView style={styles.root}><StatusBar barStyle="dark-content" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Image source={require('../assets/logo.png')} style={{ width: 64, height: 64 }} />
      <Text style={styles.title}>{page === 'home' ? 'Booklink' : 'Настройки сервера'}</Text>
      {!ready ? <ActivityIndicator /> : page === 'home' ? <>
        <Text style={styles.text}>Подключение к библиотечному серверу</Text><Text selectable style={styles.text}>{server}</Text>
        {button('Проверить подключение', () => void perform(async () => setMessage(await checkConnection(server))))}
        {button('Настройки сервера', () => { setDraft(server); setMessage(''); setPage('settings'); })}
      </> : <>
        <Text style={styles.text}>Адрес API (HTTP или HTTPS, с /api)</Text>
        <TextInput accessibilityLabel="Адрес сервера" value={draft} onChangeText={setDraft} editable={!busy} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={styles.input} />
        {button('Сохранить', () => void perform(async () => {
          const url = normalizeApiUrl(draft); await AsyncStorage.setItem(SERVER_KEY, url);
          setServer(url); setDraft(url); setMessage('Адрес сохранён.');
        }))}
        {button('Назад', () => { setMessage(''); setPage('home'); })}
      </>}
      {busy && <ActivityIndicator accessibilityLabel="Загрузка" />}
      {!!message && <Text accessibilityLiveRegion="polite" selectable style={styles.text}>{message}</Text>}
    </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' }, content: { padding: 24, gap: 18 },
  title: { fontSize: 26, fontWeight: '700', color: '#15171A' }, text: { fontSize: 16, color: '#15171A' },
  input: { borderWidth: 1, borderColor: '#5F6672', borderRadius: 12, padding: 14, fontSize: 16, color: '#15171A' },
  button: { backgroundColor: '#C7F32C', padding: 16, borderRadius: 12 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#15171A', textAlign: 'center' },
});
