import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Pressable, StatusBar, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { fonts } from "./fonts";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "./session";
import {
  Button,
  Card,
  Icon,
  LoadState,
  Screen,
  ThemeProvider,
  Txt,
  useTheme,
} from "./ui";
import { backFrom, Navigation, Route, RouteEntry, Tab } from "./navigation";
import { ScreenActivity } from "./screenActivity";
import { Account, Login } from "./screens/Auth";
import { Book, Catalog } from "./screens/Catalog";
import { ReservationDetail, Reservations } from "./screens/Reservations";
import { LoanDetail, Loans } from "./screens/Loans";
import { List, ListEditor, Lists } from "./screens/ReadingLists";
import { icons } from "./icons";
import { DialogProvider } from "./dialogs";

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fonts);
  if (!fontsLoaded) {
    return <SafeAreaProvider><SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
      {fontError ? <Text accessibilityRole="alert">Не удалось загрузить шрифты. Перезапустите приложение.</Text>
        : <ActivityIndicator accessibilityLabel="Загрузка приложения" />}
    </SafeAreaView></SafeAreaProvider>;
  }
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DialogProvider>
          <SessionProvider>
            <Root />
          </SessionProvider>
        </DialogProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
function Root() {
  const { session, server, ready, restoreError, restore, logout } =
    useSession();
  const { colors, dark } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} />
      {!ready ? (
        <Screen title="Booklink">
          <LoadState loading error="" retry={() => {}} />
        </Screen>
      ) : restoreError ? (
        <Screen title="Восстановление сеанса">
          <Card>
            <Txt>{restoreError}</Txt>
            <Button title="Повторить проверку" onPress={() => void restore()} />
            <Button
              title="Выйти"
              variant="outline"
              onPress={() => void logout()}
            />
          </Card>
        </Screen>
      ) : session ? (
        <Workspace key={`${session.user.id}:${server}`} />
      ) : (
        <Login />
      )}
    </SafeAreaView>
  );
}
function Workspace() {
  const { session, pending, busy, checking, checkPending, dismissPending } =
    useSession();
  const { colors, dark } = useTheme();
  const librarian = session?.user.role === "Librarian";
  const initial: Tab = librarian ? "reservations" : "catalog";
  const sequence = useRef(0);
  const [routes, setRoutes] = useState<RouteEntry[]>([{ key: 0, route: { screen: initial } }]);
  const entry = routes[routes.length - 1];
  const current = entry.route;
  function navigation(origin: number): Navigation {
    const makeEntry = (route: Route) => ({ key: ++sequence.current, route });
    return {
      push: route => {
        const next = makeEntry(route);
        setRoutes(rs => rs[rs.length - 1].key === origin ? [...rs, next] : rs);
      },
      back: () => setRoutes(rs => backFrom(rs, origin)),
      tab: tab => {
        const next = makeEntry({ screen: tab });
        setRoutes(rs => rs[rs.length - 1].key === origin ? [next] : rs);
      },
    };
  }
  const nav = navigation(entry.key);
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (routes.length > 1) {
        nav.back();
        return true;
      }
      if (current.screen !== initial) {
        nav.tab(initial);
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [routes, initial]);
  function renderScreen(entry: RouteEntry) {
    const current = entry.route;
    const nav = navigation(entry.key);
    let screen: React.ReactNode;
    switch (current.screen) {
      case "catalog":
        screen = <Catalog nav={nav} />;
        break;
      case "book":
        screen = <Book id={current.id} nav={nav} />;
        break;
      case "reservations":
        screen = <Reservations nav={nav} />;
        break;
      case "reservation":
        screen = <ReservationDetail id={current.id} nav={nav} />;
        break;
      case "loans":
        screen = <Loans nav={nav} />;
        break;
      case "loan":
        screen = <LoanDetail id={current.id} nav={nav} />;
        break;
      case "lists":
        screen = <Lists nav={nav} />;
        break;
      case "list":
        screen = <List id={current.id} nav={nav} />;
        break;
      case "listEditor":
        screen = (
          <ListEditor id={current.id} initialName={current.name} nav={nav} />
        );
        break;
      case "chooseList":
        screen = <Lists bookId={current.bookId} nav={nav} />;
        break;
      case "chooseBook":
        screen = <Catalog listId={current.listId} nav={nav} />;
        break;
      case "account":
        screen = <Account />;
        break;
    }
    return screen;
  }
  const tabs: [Tab, string][] = librarian
    ? [
        ["reservations", "Брони"],
        ["loans", "Выдачи"],
        ["account", "Аккаунт"],
      ]
    : [
        ["catalog", "Каталог"],
        ["reservations", "Брони"],
        ["loans", "Мои книги"],
        ["lists", "Списки"],
        ["account", "Аккаунт"],
      ];
  function iconFor(tab: Tab, selected: boolean): keyof typeof icons {
    if (selected)
      return (
        {
          catalog: "catalog",
          reservations: "reservationOn",
          loans: "loanOn",
          lists: "listOn",
          account: "accountOn",
        } as const
      )[tab];
    if (tab === "catalog") return "catalogOff";
    return (dark ? `${tab}Dark` : tab) as keyof typeof icons;
  }
  return (
    <View style={{ flex: 1 }}>
      {pending ? (
        <View style={{ backgroundColor: colors.info, padding: 10, gap: 6 }}>
          <Txt style={{ fontSize: 12 }}>
            Результат операции пока неизвестен. Изменения заблокированы до
            проверки.
          </Txt>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void checkPending()}
              disabled={checking || busy}
              style={{ padding: 6 }}
            >
              <Txt style={{ fontWeight: "700", fontSize: 12 }}>
                {checking ? "Проверяем…" : "Проверить результат"}
              </Txt>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={dismissPending}
              disabled={checking || busy}
              style={{ padding: 6 }}
            >
              <Txt style={{ fontSize: 12 }}>Снять блокировку</Txt>
            </Pressable>
          </View>
        </View>
      ) : null}
      {routes.map(item => (
        <ScreenActivity.Provider key={item.key} value={item.key === entry.key}>
          <View
            style={{ flex: 1, display: item.key === entry.key ? "flex" : "none" }}
            accessibilityElementsHidden={item.key !== entry.key}
            importantForAccessibility={item.key === entry.key ? "auto" : "no-hide-descendants"}
          >
            {renderScreen(item)}
          </View>
        </ScreenActivity.Provider>
      ))}
      {routes.length === 1 ? (
        <View
          style={{
            borderTopWidth: 1,
            borderColor: colors.line,
            flexDirection: "row",
            alignItems: "stretch",
            paddingVertical: 6,
          }}
        >
          {tabs.map(([tab, label]) => {
            const selected = current.screen === tab;
            return (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected }}
                onPress={() => nav.tab(tab)}
                style={{
                  flex: 1,
                  gap: 3,
                  alignItems: "center",
                  paddingHorizontal: 2,
                  minHeight: 56,
                }}
              >
                <View
                  style={{
                    backgroundColor: selected ? colors.accent : "transparent",
                    width: 52,
                    height: 30,
                    borderRadius: 7,
                    overflow: "hidden",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Icon name={iconFor(tab, selected)} />
                </View>
                <Txt
                  maxFontSizeMultiplier={1.4}
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    color: selected ? colors.text : colors.hint,
                    fontWeight: selected ? "700" : "400",
                  }}
                >
                  {label}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
