import React, { useState } from "react";
import { Keyboard, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useResource, useSearch } from "../resource";
import { Book as BookDto, BookItem, Page } from "../types";
import {
  BookHeading,
  Button,
  Cover,
  Empty,
  LoadState,
  Muted,
  Screen,
  SearchField,
  Status,
  Txt,
  useTheme,
} from "../ui";
import { Navigation } from "../navigation";

export function Catalog({ nav }: { nav: Navigation }) {
  const search = useSearch();
  const { colors } = useTheme();
  return (
    <Screen
      title="Каталог"
      titleStyle={{ fontSize: 22 }}
    >
      <SearchField
        placeholder="Название или автор"
        value={search.text}
        onChangeText={search.setText}
        clearButtonMode="never"
        trailing={search.text ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Очистить поиск"
            onPress={() => search.setText("")}
            style={{ minWidth: 36, minHeight: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="m7 7 10 10M17 7 7 17" stroke={colors.muted} strokeWidth={1.6} strokeLinecap="round" />
            </Svg>
          </Pressable>
        ) : undefined}
      />
      <CatalogPage
        key={search.query}
        query={search.query}
        nav={nav}
        searching={search.text.trim() !== search.query}
        resetSearch={() => { Keyboard.dismiss(); search.setText(""); }}
      />
    </Screen>
  );
}
function CatalogPage({
  query,
  nav,
  searching,
  resetSearch,
}: {
  query: string;
  nav: Navigation;
  searching: boolean;
  resetSearch: () => void;
}) {
  const [page, setPage] = useState(1);
  const resource = useResource<Page<BookItem>>(
    `/books?search=${encodeURIComponent(query)}&page=${page}`,
  );
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const loading = searching || (resource.loading && !resource.data);
  const initialError = !loading && !resource.data && !!resource.error;
  function select(book: BookItem) { nav.push({ screen: "book", id: book.id }); }
  return (
    <>
      {initialError ? <CatalogLoadError error={resource.error} retry={() => void resource.reload()} />
        : <LoadState {...resource} loading={loading} variant="books" error={loading ? "" : resource.error} retry={() => void resource.reload()} />}
      {!loading && resource.data ? (
        <>
          {resource.data.items.length > 0 ? <Muted>Найдено книг: {resource.data.total}</Muted> : null}
          {resource.data.items.length === 0 ? (
            query ? <SearchEmpty resetSearch={resetSearch} /> : <Empty text="В каталоге пока нет книг." />
          ) : (
            <View>{resource.data.items.map((book) => (
              <Pressable
                key={book.id}
                accessibilityRole="button"
                accessibilityLabel={book.title}
                onPress={() => void select(book)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderColor: colors.line,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <Cover book={book} />
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Txt numberOfLines={fontScale > 1.3 ? undefined : 1} style={{ fontSize: 15, fontWeight: "700" }}>
                    {book.title}
                  </Txt>
                  <Txt numberOfLines={fontScale > 1.3 ? undefined : 1} style={{ fontSize: 13, color: colors.muted }}>
                    {book.authors}
                  </Txt>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: book.availableCopies ? colors.green : colors.muted }} />
                  <Txt
                    style={{
                      flex: 1,
                      fontSize: 12,
                      fontWeight: "700",
                      color: book.availableCopies ? colors.green : colors.muted,
                    }}
                  >
                    {book.availableCopies
                      ? `Доступно: ${book.availableCopies}`
                      : "Нет доступных экземпляров"}
                  </Txt>
                  </View>
                </View>
                <Svg width={16} height={20} viewBox="0 0 16 20">
                  <Path d="m6 5 5 5-5 5" stroke={colors.hint} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </Svg>
              </Pressable>
            ))}</View>
          )}
          {resource.data.total > resource.data.pageSize ? (
            <CatalogPagination
              page={page}
              totalPages={Math.ceil(resource.data.total / resource.data.pageSize)}
              loading={resource.loading}
              onChange={setPage}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}

function CatalogPagination({
  page,
  totalPages,
  loading,
  onChange,
}: {
  page: number;
  totalPages: number;
  loading: boolean;
  onChange: (page: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[catalogStyles.pagination, { backgroundColor: colors.surface }]}>
      {([-1, 1] as const).map((direction) => {
        const disabled = loading || (direction === -1 ? page === 1 : page >= totalPages);
        return (
          <React.Fragment key={direction}>
            {direction === 1 ? (
              <View style={catalogStyles.pageNumber} accessible accessibilityLabel={`Страница ${page} из ${totalPages}`} accessibilityLiveRegion="polite">
                <Txt style={{ fontSize: 11, color: colors.muted }}>Страница</Txt>
                <Txt style={{ fontSize: 17, fontWeight: "700" }}>{page} из {totalPages}</Txt>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={direction === -1 ? "Предыдущая страница" : "Следующая страница"}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => onChange(page + direction)}
              style={({ pressed }) => [
                catalogStyles.pageArrow,
                {
                  backgroundColor: disabled ? "transparent" : colors.accent,
                  borderColor: disabled ? colors.line : colors.accent,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path
                  d={direction === -1 ? "M19 12H5m6-6-6 6 6 6" : "M5 12h14m-6-6 6 6-6 6"}
                  stroke={disabled ? colors.hint : "#15171A"}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

function CatalogLoadError({ error, retry }: { error: string; retry: () => void }) {
  const { colors } = useTheme();
  const network = error.startsWith("Нет ответа сервера.");
  return <View style={{ flex: 1, minHeight: 340, justifyContent: "center", alignItems: "center", paddingTop: 24, paddingBottom: 72 }}>
    <View style={{ width: "100%", maxWidth: 320, alignItems: "center", gap: 10 }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.disabled, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Svg width={56} height={56} viewBox="0 0 64 64" fill="none">
          <Path d="M8 8 56 56M9 27a36 36 0 0 1 9-5m11-3a36 36 0 0 1 26 8M18 36a23 23 0 0 1 9-5m12 1a23 23 0 0 1 7 4M27 45a9 9 0 0 1 8-1" stroke={colors.hint} strokeWidth={1.8} strokeLinecap="round" />
          <Circle cx={32} cy={53} r={1.2} fill={colors.hint} />
        </Svg>
      </View>
      <Txt accessibilityRole="header" style={{ fontSize: 20, fontWeight: "700", textAlign: "center" }}>
        {network ? "Нет соединения с сервером" : "Не удалось загрузить каталог"}
      </Txt>
      <Txt accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 14, textAlign: "center", maxWidth: 290 }}>
        {network ? "Каталог загружается с сервера. Проверьте подключение и повторите попытку." : error}
      </Txt>
      <Button title="Повторить" icon="retry" onPress={retry} style={{ minHeight: 46, paddingHorizontal: 22, marginTop: 8 }} textStyle={{ fontSize: 16 }} />
    </View>
  </View>;
}

function SearchEmpty({ resetSearch }: { resetSearch: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={catalogStyles.empty}>
      <View style={[catalogStyles.emptyIcon, { backgroundColor: colors.disabled }]}>
        <Svg width={40} height={40} viewBox="0 0 40 40">
          <Circle cx={17} cy={17} r={12} stroke={colors.hint} strokeWidth={1.3} fill="none" />
          <Path d="m26 26 9 9" stroke={colors.hint} strokeWidth={1.3} strokeLinecap="round" />
        </Svg>
      </View>
      <View style={{ gap: 4, alignItems: "center" }}>
        <Txt accessibilityRole="header" style={{ fontSize: 18, fontWeight: "700", textAlign: "center" }}>Ничего не найдено</Txt>
        <Txt style={{ fontSize: 14, color: colors.muted, textAlign: "center", maxWidth: 290 }}>
          Поиск идёт по части названия и имени автора. Проверьте запрос.
        </Txt>
      </View>
      <Button title="Сбросить поиск" variant="outline" onPress={resetSearch} style={{ alignSelf: "center" }} />
    </View>
  );
}

const catalogStyles = StyleSheet.create({
  pagination: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 7, marginTop: 4 },
  pageNumber: { flex: 1, minWidth: 0, alignItems: "center", gap: 2 },
  pageArrow: { width: 48, height: 48, borderRadius: 7, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 86, paddingBottom: 24, gap: 24 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
});
export function Book({ id, nav }: { id: number; nav: Navigation }) {
  const resource = useResource<BookDto>(`/books/${id}`);
  const book = resource.data;
  return (
    <Screen
      back={nav.back}
      refreshing={resource.loading && !!book}
      onRefresh={() => void resource.reload()}
    >
      <LoadState
        loading={resource.loading && !book}
        error={resource.error}
        data={resource.data}
        retry={() => void resource.reload()}
      />
      {book ? (
        <>
          <BookHeading book={book} large>
            <Status
              text={book.availableCopies === 0 ? "Нет в наличии" : `Доступно: ${book.availableCopies} из ${book.totalCopies}`}
              bad={!book.availableCopies}
            />
            <Muted>Год издания: {book.year ?? "не указан"}</Muted>
          </BookHeading>
          <Txt style={{ fontSize: 16, fontWeight: "700" }}>Описание</Txt>
          <Muted>{book.description || "Описание пока не добавлено."}</Muted>
        </>
      ) : null}
    </Screen>
  );
}

