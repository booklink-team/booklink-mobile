import React, { useCallback, useContext, useLayoutEffect, useRef, useState } from "react";
import { Animated, Easing, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "../api";
import type { Api } from "../api";
import { FeedbackDialog } from "../FeedbackDialog";
import { Navigation } from "../navigation";
import { useResource } from "../resource";
import { ScreenActivity } from "../screenActivity";
import { useSession } from "../session";
import { ListDetails, ReadingList } from "../types";
import { loadListChoices, type ListChoice } from "../listChoices";
import { Button, Cover, Field, LoadState, Muted, Screen, Txt, useTheme } from "../ui";

type ListIdentity = Pick<ReadingList, "id" | "name">;
type ListAction = { kind: "create" } | { kind: "menu" | "rename" | "delete"; list: ListIdentity };
type GlyphName = "book" | "more" | "plus" | "edit" | "trash" | "close" | "empty";

function Glyph({ name, color, size = 24 }: { name: GlyphName; color?: string; size?: number }) {
  const { colors } = useTheme();
  const paths: Record<GlyphName, string> = {
    book: "M6 3h12v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm-2 14h14",
    more: "", plus: "M12 5v14M5 12h14",
    edit: "m14 5 5 5M4 16l-1 5 5-1L21 7a2.8 2.8 0 0 0-4-4L4 16ZM13 21h8",
    trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
    close: "m6 6 12 12M18 6 6 18", empty: "M4 4h16v15H7l-3 3V4Z",
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    {name === "more" ? [5, 12, 19].map(cy => <Circle key={cy} cx={12} cy={cy} r={1.8} fill={color ?? colors.muted} />)
      : <Path d={paths[name]} stroke={color ?? colors.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
  </Svg>;
}

function IconButton({ label, icon, onPress, disabled = false }: {
  label: string; icon: GlyphName; onPress: () => void; disabled?: boolean;
}) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.iconButton, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}>
    <Glyph name={icon} color={colors.muted} size={20} />
  </Pressable>;
}

function bookCount(count: number) {
  const last = count % 10, lastTwo = count % 100;
  return `${count} ${lastTwo >= 11 && lastTwo <= 14 ? "книг" : last === 1 ? "книга" : last >= 2 && last <= 4 ? "книги" : "книг"}`;
}

function useListActions(onDeleted?: () => void, initial?: ListAction, onDismiss?: () => void) {
  const [action, setAction] = useState<ListAction | null>(initial ?? null);
  const active = useContext(ScreenActivity);
  function close() { setAction(null); onDismiss?.(); }
  return {
    create: () => setAction({ kind: "create" }),
    menu: (list: ListIdentity) => setAction({ kind: "menu", list }),
    overlay: <ListOverlay action={action} visible={active && !!action} close={close} change={setAction} onDeleted={onDeleted} />,
  };
}

export function Lists({ nav, bookId }: { nav: Navigation; bookId?: number }) {
  const loader = useCallback(async (api: Api) => {
    if (bookId) return loadListChoices(api, bookId);
    const lists = await api.get<ReadingList[]>("/lists");
    return lists.map(list => ({ ...list, containsBook: false }));
  }, [bookId]);
  const resource = useResource<ListChoice[]>("/lists", loader);
  const { mutate, busy, pending } = useSession();
  const { colors, dark } = useTheme();
  const actions = useListActions();
  const active = useContext(ScreenActivity);
  const [addedTo, setAddedTo] = useState<ReadingList | null>(null);
  const [selectionError, setSelectionError] = useState("");
  const locked = busy || !!pending || resource.loading || !!resource.error;
  function closeAdded() { setAddedTo(null); nav.back(); }
  async function select(item: ListChoice) {
    if (bookId) {
      if (locked || item.containsBook) return;
      setSelectionError("");
      await mutate(() => ({ kind: "addBook", id: item.id, bookId }), () => setAddedTo(item), (error, uncertain) => {
        if (error instanceof ApiError && error.code === "book_already_in_list") {
          setSelectionError("Книга уже в этом списке. Выберите другой.");
          void resource.reload();
        } else setSelectionError(uncertain ? "Ответ не получен. Результат добавления проверяется на сервере." : error.message);
      });
    } else nav.push({ screen: "list", id: item.id });
  }
  return <Screen title={bookId ? "Выберите список" : "Списки"} titleStyle={{ fontSize: 22 }}
    back={bookId ? nav.back : undefined} refreshing={resource.loading && !!resource.data} onRefresh={() => void resource.reload()}
    footer={<Button title="Создать новый список" onPress={actions.create} disabled={locked} />}>
    <FeedbackDialog visible={active && !!addedTo} close={closeAdded} title="Книга добавлена в список"
      message={`Книга сохранена в подборке «${addedTo?.name ?? ""}».`} primary={{ title: "Понятно", onPress: closeAdded }} />
    {actions.overlay}
    <LoadState {...resource} loading={resource.loading && !resource.data} retry={() => void resource.reload()} />
    {selectionError ? <Txt accessibilityLiveRegion="polite" style={{ color: colors.red, fontSize: 13 }}>{selectionError}</Txt> : null}
    {!resource.loading && !resource.error && !resource.data?.length ? <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.disabled }]}><Glyph name="book" size={36} color={colors.hint} /></View>
      <Txt style={styles.emptyTitle}>Списков пока нет</Txt>
      <Txt style={[styles.emptyText, { color: colors.muted }]}>Создайте свою подборку и добавляйте в неё книги из каталога.</Txt>
    </View> : null}
    <View style={{ gap: 10 }}>
      {resource.data?.map(item => <View key={item.id} style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.line, opacity: bookId && item.containsBook ? 0.55 : 1 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={bookId ? item.containsBook ? `${item.name}. Книга уже в списке` : `Добавить в список «${item.name}»` : item.name}
          accessibilityState={{ disabled: !!bookId && (locked || item.containsBook) }}
          disabled={!!bookId && (locked || item.containsBook)} onPress={() => void select(item)}
          style={({ pressed }) => [styles.listCardMain, { opacity: pressed ? 0.65 : 1 }]}>
          <View style={[styles.listIcon, { backgroundColor: dark ? "#303D18" : "#E5F3AD" }]}><Glyph name="book" /></View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Txt style={{ fontSize: 16, fontWeight: "700" }}>{item.name}</Txt>
            <Txt style={{ fontSize: 12, color: colors.hint }}>{bookId && item.containsBook ? "Книга уже в списке" : bookCount(item.bookCount)}</Txt>
          </View>
        </Pressable>
        {!bookId ? <IconButton label={`Действия со списком «${item.name}»`} icon="more" disabled={locked} onPress={() => actions.menu(item)} /> : null}
      </View>)}
    </View>
  </Screen>;
}

export function List({ id, nav }: { id: number; nav: Navigation }) {
  const resource = useResource<ListDetails>(`/lists/${id}`);
  const { mutate, busy, pending } = useSession();
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [error, setError] = useState("");
  const list = resource.data;
  const locked = busy || !!pending || !!resource.error || resource.loading;
  const actions = useListActions(nav.back);
  const addBook = () => nav.push({ screen: "chooseBook", listId: id });
  return <Screen title={list?.name} back={nav.back}
    refreshing={resource.loading && !!list} onRefresh={() => void resource.reload()}
    headerRight={list ? <View style={{ flexDirection: "row" }}>
      {list.books.length ? <IconButton label="Добавить книгу" icon="plus" disabled={locked} onPress={addBook} /> : null}
      <IconButton label="Действия со списком" icon="more" disabled={locked} onPress={() => actions.menu(list)} />
    </View> : undefined}>
    {actions.overlay}
    <LoadState {...resource} loading={resource.loading && !list} variant="books" retry={() => void resource.reload()} />
    {error ? <Txt style={{ color: colors.red }}>{error}</Txt> : null}
    {list ? list.books.length ? <>
      <Muted>{bookCount(list.books.length)}</Muted>
      <View>{list.books.map(book => <View key={book.id} style={[styles.bookRow, { borderColor: colors.line }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={book.title} onPress={() => nav.push({ screen: "book", id: book.id })}
          style={({ pressed }) => [styles.bookMain, { opacity: pressed ? 0.65 : 1 }]}>
          <Cover book={book} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Txt numberOfLines={fontScale > 1.3 ? undefined : 1} style={{ fontSize: 15, fontWeight: "700" }}>{book.title}</Txt>
            <Txt numberOfLines={fontScale > 1.3 ? undefined : 1} style={{ fontSize: 13, color: colors.muted }}>{book.authors}</Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: book.availableCopies ? colors.green : colors.muted }} />
              <Txt style={{ flex: 1, fontSize: 12, fontWeight: "700", color: book.availableCopies ? colors.green : colors.muted }}>
                {book.availableCopies ? `Доступно: ${book.availableCopies}` : "Нет в наличии"}
              </Txt>
            </View>
          </View>
        </Pressable>
        <IconButton label={`Удалить из списка: ${book.title}`} icon="close" disabled={locked} onPress={() => {
          setError("");
          void mutate(() => ({ kind: "removeBook", id, bookId: book.id }), () => {},
            (e, uncertain) => setError(uncertain ? "Ответ не получен. Результат удаления проверяется на сервере." : e.message));
        }} />
      </View>)}</View>
    </> : <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.disabled }]}><Glyph name="empty" size={36} color={colors.hint} /></View>
      <Txt style={styles.emptyTitle}>В списке пока нет книг</Txt>
      <Txt style={[styles.emptyText, { color: colors.muted }]}>Добавляйте книги из карточки в каталоге. Это не бронирование.</Txt>
      <Button title="Перейти в каталог" onPress={addBook} disabled={locked} style={{ alignSelf: "center", marginTop: 12 }} />
    </View> : null}
  </Screen>;
}

function ListOverlay({ action, visible, close, change, onDeleted }: {
  action: ListAction | null; visible: boolean; close: () => void;
  change: (action: ListAction) => void; onDeleted?: () => void;
}) {
  const { colors } = useTheme();
  const { busy } = useSession();
  const insets = useSafeAreaInsets();
  const sheet = action?.kind === "menu";
  const { height } = useWindowDimensions();
  const sheetOffset = useRef(new Animated.Value(height)).current;
  useLayoutEffect(() => {
    sheetOffset.setValue(visible && sheet ? height : 0);
    if (!visible || !sheet) return;
    const animation = Animated.timing(sheetOffset, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [visible, sheet, height, sheetOffset]);
  const dismiss = () => { if (!busy) { Keyboard.dismiss(); close(); } };
  return <Modal transparent visible={visible} animationType={sheet ? "none" : "fade"} statusBarTranslucent onRequestClose={dismiss}>
    <KeyboardAvoidingView style={[styles.modalBackdrop, { justifyContent: sheet ? "flex-end" : "center", padding: sheet ? 0 : 24 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={dismiss} />
      <Animated.ScrollView keyboardShouldPersistTaps="handled" accessibilityViewIsModal
        style={[{ width: "100%", maxWidth: sheet ? undefined : 360, maxHeight: "90%", flexGrow: 0, backgroundColor: colors.bg },
          sheet ? { borderTopLeftRadius: 20, borderTopRightRadius: 20, transform: [{ translateY: sheetOffset }] } : { borderRadius: 20 }]}
        contentContainerStyle={{ padding: 20, paddingBottom: sheet ? Math.max(16, insets.bottom + 8) : 20, gap: sheet ? 8 : 12 }}>
        {action?.kind === "menu" ? <>
          <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: "center", marginTop: -8 }} />
          <Txt accessibilityRole="header" style={{ fontSize: 20, fontWeight: "700" }}>{action.list.name}</Txt>
          <SheetAction label="Переименовать" icon="edit" onPress={() => change({ kind: "rename", list: action.list })} />
          <SheetAction label="Удалить список" icon="trash" danger onPress={() => change({ kind: "delete", list: action.list })} />
        </> : action?.kind === "delete" ? <DeleteListForm key={action.list.id} list={action.list} close={dismiss} deleted={() => { close(); onDeleted?.(); }} />
          : action ? <ListNameForm key={`${action.kind}:${action.kind === "rename" ? action.list.id : "new"}`} list={action.kind === "rename" ? action.list : undefined} close={dismiss} saved={close} /> : null}
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}

function SheetAction({ label, icon, danger = false, onPress }: { label: string; icon: GlyphName; danger?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => ({ flexDirection: "row", gap: 12, alignItems: "center", minHeight: 48, opacity: pressed ? 0.6 : 1 })}>
    <Glyph name={icon} color={danger ? colors.red : colors.text} />
    <Txt style={{ flex: 1, fontSize: 16, fontWeight: "700", color: danger ? colors.red : colors.text }}>{label}</Txt>
  </Pressable>;
}

function ListNameForm({ list, close, saved }: { list?: ListIdentity; close: () => void; saved: () => void }) {
  const { api, mutate, busy, pending } = useSession();
  const { colors } = useTheme();
  const [name, setName] = useState(list?.name ?? "");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  async function save() {
    if (busy || pending) return;
    Keyboard.dismiss();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 50) { setError("Название должно содержать от 1 до 50 символов."); return; }
    setError("");
    await mutate(async () => {
      if (list) return { kind: "renameList", id: list.id, name: trimmed };
      const before = await api.get<ReadingList[]>("/lists");
      return { kind: "createList", name: trimmed, beforeIds: before.map(item => item.id) };
    }, saved, (e, uncertain) => setError(uncertain ? "Ответ не получен. Результат сохранения проверяется на сервере."
      : e instanceof ApiError && e.code === "list_name_taken" ? "Такой список уже есть" : e.message));
  }
  return <>
    <Txt accessibilityRole="header" style={{ fontSize: 20, fontWeight: "700" }}>{list ? "Переименовать список" : "Новый список"}</Txt>
    <View style={{ gap: 4 }}>
      <Field label="Название" gap={4} value={name} placeholder="Например, к учёбе" autoFocus maxLength={100}
        editable={!busy && !pending} returnKeyType="done" onSubmitEditing={() => void save()}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onChangeText={value => { setName(value); setError(""); }}
        containerStyle={{ borderColor: error ? colors.red : focused ? colors.accent : colors.line }} />
      {error ? <Txt accessibilityLiveRegion="polite" style={{ fontSize: 12, color: colors.red }}>{error}</Txt> : null}
      <Txt style={{ fontSize: 11, color: name.trim().length > 50 ? colors.red : colors.hint, textAlign: "right" }}>{name.trim().length}/50</Txt>
    </View>
    <View style={{ gap: 8 }}>
      <Button title={list ? "Сохранить" : "Создать"} onPress={() => void save()} loading={busy} disabled={!!pending || !name.trim()} />
      <Button title="Отмена" variant="outline" onPress={close} disabled={busy} />
    </View>
  </>;
}

function DeleteListForm({ list, close, deleted }: { list: ListIdentity; close: () => void; deleted: () => void }) {
  const { mutate, busy, pending } = useSession();
  const { colors } = useTheme();
  const [error, setError] = useState("");
  return <>
    <View style={{ alignItems: "center", gap: 12 }}>
      <View style={[styles.deleteIcon, { backgroundColor: colors.redBg }]}><Glyph name="trash" color={colors.red} /></View>
      <Txt accessibilityRole="header" style={{ fontSize: 18, fontWeight: "700", textAlign: "center" }}>Удалить список «{list.name}»?</Txt>
      <Txt style={[styles.emptyText, { color: colors.muted }]}>Книги в каталоге останутся. Бронирования и выдачи не изменятся.</Txt>
    </View>
    {error ? <Txt accessibilityLiveRegion="polite" style={{ color: colors.red, fontSize: 12 }}>{error}</Txt> : null}
    <View style={{ gap: 8 }}>
      <Button title="Удалить" variant="danger" loading={busy} disabled={!!pending}
        style={{ backgroundColor: busy || pending ? colors.disabled : colors.red }} textStyle={{ color: busy || pending ? colors.hint : "#FFFFFF" }}
        onPress={() => { setError(""); void mutate(() => ({ kind: "deleteList", id: list.id }), deleted,
          (e, uncertain) => setError(uncertain ? "Ответ не получен. Результат удаления проверяется на сервере." : e.message)); }} />
      <Button title="Отмена" variant="outline" onPress={close} disabled={busy} />
    </View>
  </>;
}

// Retain compatibility with an already-open editor route.
export function ListEditor({ id, initialName = "", nav }: { id?: number; initialName?: string; nav: Navigation }) {
  const actions = useListActions(undefined, id ? { kind: "rename", list: { id, name: initialName } } : { kind: "create" }, nav.back);
  return <Screen title="Списки" back={nav.back}>{actions.overlay}</Screen>;
}

const styles = StyleSheet.create({
  listCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 18, padding: 8, gap: 2 },
  listCardMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 14, padding: 6 },
  listIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconButton: { width: 44, minHeight: 48, borderRadius: 7, justifyContent: "center", alignItems: "center" },
  bookRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, gap: 6 },
  bookMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  empty: { paddingTop: 120, paddingBottom: 24, alignItems: "center", gap: 12 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptyText: { fontSize: 14, textAlign: "center", maxWidth: 290 },
  deleteIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  modalBackdrop: { flex: 1, alignItems: "center", backgroundColor: "rgba(0,0,0,0.45)" },
});
