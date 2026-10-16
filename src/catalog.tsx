import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Api, ApiError } from './api';
import { useSession } from './session';

type BookItem = {
  id: number; title: string; authors: string; year: number | null;
  coverUrl: string | null; availableCopies: number;
};
type Book = BookItem & { description: string | null; totalCopies: number };
type Page = { items: BookItem[]; page: number; pageSize: number; total: number };

function useBooks<T>(path: string) {
  const { server, session, controller } = useSession();
  const token = session?.accessToken;
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    lock.current = true;
    setLoading(true); setError(''); setData(undefined);
    void new Api(server, token).request<T>(path).then(result => {
      if (active) setData(result);
    }).catch(failure => {
      if (!active) return;
      if (failure instanceof ApiError && failure.status === 401 && token) void controller.expireSession(token);
      setError(failure instanceof Error ? failure.message : 'Не удалось загрузить книги.');
    }).finally(() => {
      if (active) { lock.current = false; setLoading(false); }
    });
    return () => { active = false; };
  }, [server, token, path, attempt, controller]);
  function retry() {
    if (lock.current) return;
    lock.current = true;
    setAttempt(value => value + 1);
  }
  return { data, loading, error, retry };
}

export function Catalog({ openAccount }: { openAccount: () => void }) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [bookId, setBookId] = useState<number | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(text.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [text]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (bookId !== null) { setBookId(null); return true; }
      return false;
    });
    return () => listener.remove();
  }, [bookId]);
  if (bookId !== null) return <BookDetails key={bookId} id={bookId} back={() => setBookId(null)} />;
  const searching = text.trim() !== query;
  return <View style={styles.root}>
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>Каталог</Text>
      <Button title="Аккаунт" onPress={() => { Keyboard.dismiss(); openAccount(); }} />
    </View>
    <View style={styles.search}>
      <TextInput accessibilityLabel="Название или автор" placeholder="Название или автор"
        placeholderTextColor="#7B818C" value={text} onChangeText={setText}
        autoCapitalize="none" autoCorrect={false} returnKeyType="search"
        onSubmitEditing={() => Keyboard.dismiss()} style={styles.input} />
      {!!text && <Pressable accessibilityRole="button" accessibilityLabel="Очистить поиск"
        onPress={() => setText('')} style={styles.clear}><Text style={styles.clearText}>×</Text></Pressable>}
    </View>
    {searching ? <Loading /> : <CatalogPage key={`${query}:${page}`} query={query} page={page}
      changePage={setPage} select={id => { Keyboard.dismiss(); setBookId(id); }} />}
  </View>;
}

function CatalogPage({ query, page, changePage, select }: {
  query: string; page: number; changePage: (page: number) => void; select: (id: number) => void;
}) {
  const { data, loading, error, retry } = useBooks<Page>(`/books?search=${encodeURIComponent(query)}&page=${page}`);
  if (loading) return <Loading />;
  if (error) return <Failure message={error} retry={retry} />;
  if (!data) return null;
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.muted}>Найдено книг: {data.total}</Text>
    {data.items.length === 0 ? <Text accessibilityLiveRegion="polite" style={styles.empty}>
      {query ? 'Ничего не найдено. Проверьте название или автора.' : 'В каталоге пока нет книг.'}
    </Text> : data.items.map(book => <Pressable key={book.id} accessibilityRole="button"
      accessibilityLabel={`${book.title}, ${book.authors}, доступно: ${book.availableCopies}`}
      onPress={() => select(book.id)} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.65 : 1 }]}>
      <Cover book={book} />
      <View style={styles.summary}>
        <Text style={styles.bookTitle}>{book.title}</Text>
        <Text style={styles.author}>{book.authors}</Text>
        <Text style={[styles.availability, !book.availableCopies && styles.muted]}>
          {book.availableCopies ? `● Доступно: ${book.availableCopies}` : 'Нет доступных экземпляров'}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>)}
    {pages > 1 && <View style={styles.pagination}>
      <Button title="Назад" label="Предыдущая страница" disabled={page <= 1} onPress={() => changePage(page - 1)} />
      <Text accessibilityLiveRegion="polite" style={styles.page}>Страница {data.page} из {pages}</Text>
      <Button title="Далее" label="Следующая страница" disabled={page >= pages} onPress={() => changePage(page + 1)} />
    </View>}
  </ScrollView>;
}

function BookDetails({ id, back }: { id: number; back: () => void }) {
  const { data: book, loading, error, retry } = useBooks<Book>(`/books/${id}`);
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / fontScale < 340;
  return <View style={styles.root}>
    <View style={styles.header}>
      <Button title="Назад" onPress={back} />
      <Text accessibilityRole="header" style={styles.title}>Карточка книги</Text>
    </View>
    {loading ? <Loading /> : error ? <Failure message={error} retry={retry} /> : book ?
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heading, stacked && { flexDirection: 'column' }]}>
          <Cover book={book} large />
          <View style={[styles.summary, stacked && { flex: 0, width: '100%' }]}>
            <Text style={styles.detailTitle}>{book.title}</Text>
            <Text style={styles.muted}>{book.authors}</Text>
            <Text style={[styles.availability, !book.availableCopies && styles.muted]}>
              Доступно: {book.availableCopies} из {book.totalCopies}
            </Text>
            <Text style={styles.muted}>Год издания: {book.year ?? 'не указан'}</Text>
          </View>
        </View>
        <Text style={styles.bookTitle}>Описание</Text>
        <Text style={styles.description}>{book.description || 'Описание пока не добавлено.'}</Text>
      </ScrollView> : null}
  </View>;
}

function Cover({ book, large = false }: { book: BookItem; large?: boolean }) {
  const { server } = useSession();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [server, book.coverUrl]);
  let uri: string | undefined;
  try {
    if (book.coverUrl) {
      const url = new URL(book.coverUrl, `${server}/`);
      if (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '10.0.2.2', '[::1]'].includes(url.hostname))) uri = url.toString();
    }
  } catch {}
  const size = { width: large ? 120 : 56, height: large ? 172 : 80 };
  if (uri && !failed) return <Image source={{ uri }} accessibilityLabel={`Обложка: ${book.title}`}
    style={[styles.cover, size]} resizeMode="cover" onError={() => setFailed(true)} />;
  return <View accessible accessibilityLabel="Обложка отсутствует" style={[styles.cover, styles.placeholder, size]}>
    <Text style={styles.placeholderText}>{'Нет\nобложки'}</Text>
  </View>;
}

function Loading() {
  return <View style={styles.state} accessibilityLiveRegion="polite">
    <ActivityIndicator color="#2E7D32" accessibilityLabel="Загрузка книг" />
    <Text style={styles.muted}>Загрузка…</Text>
  </View>;
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return <View style={styles.state}>
    <Text accessibilityRole="alert" style={styles.error}>{message}</Text>
    <Button title="Повторить загрузку" onPress={retry} />
  </View>;
}
function Button({ title, label, disabled = false, onPress }: {
  title: string; label?: string; disabled?: boolean; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label ?? title}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, { opacity: disabled ? 0.4 : pressed ? 0.65 : 1 }]}>
    <Text style={styles.buttonText}>{title}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#15171A' },
  search: { marginHorizontal: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E4E9', borderRadius: 24, backgroundColor: '#F4F5F7' },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#15171A' },
  clear: { minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 24, color: '#5F6672' },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#E2E4E9' },
  cover: { borderRadius: 7 }, placeholder: { backgroundColor: '#E0EDE2', borderWidth: 1, borderColor: '#E2E4E9', alignItems: 'center', justifyContent: 'center', padding: 3 },
  placeholderText: { fontSize: 11, textAlign: 'center', color: '#5F6672' },
  summary: { flex: 1, minWidth: 0, gap: 5 },
  bookTitle: { fontSize: 15, fontWeight: '700', color: '#15171A' },
  author: { fontSize: 13, color: '#5F6672' },
  muted: { fontSize: 14, color: '#5F6672' },
  availability: { fontSize: 12, fontWeight: '700', color: '#2E7D32' },
  chevron: { fontSize: 28, color: '#7B818C' },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  detailTitle: { fontSize: 21, fontWeight: '700', color: '#15171A' },
  description: { fontSize: 15, lineHeight: 23, color: '#5F6672' },
  pagination: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingVertical: 12 },
  page: { flex: 1, minWidth: 70, textAlign: 'center', fontSize: 13, color: '#5F6672' },
  button: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 7, backgroundColor: '#C7F32C', justifyContent: 'center' },
  buttonText: { fontSize: 14, fontWeight: '600', color: '#15171A', textAlign: 'center' },
  state: { padding: 24, alignItems: 'center', gap: 16 },
  error: { fontSize: 16, color: '#C62828', textAlign: 'center' },
  empty: { paddingVertical: 48, fontSize: 16, color: '#5F6672', textAlign: 'center' },
});
