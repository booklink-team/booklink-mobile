import React, { createContext, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  StyleProp,
  TextStyle,
  ViewStyle,
  View,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SvgXml } from "react-native-svg";
import { icons } from "./icons";
import { BookShort } from "./types";
import { useSession } from "./session";
import { fontFamily } from "./fonts";

const light = {
  bg: "#FFFFFF",
  surface: "#F4F5F7",
  text: "#15171A",
  muted: "#5F6672",
  hint: "#7B818C",
  line: "#E2E4E9",
  accent: "#C7F32C",
  green: "#2E7D32",
  greenBg: "#E0EDE2",
  red: "#C62828",
  redBg: "#F9E2E2",
  info: "#E8F0FB",
  disabled: "#E8EAEE",
};
const dark = {
  bg: "#0B0B0C",
  surface: "#17171A",
  text: "#F4F4F5",
  muted: "#A3A3AB",
  hint: "#90909A",
  line: "#29292E",
  accent: "#C7F32C",
  green: "#7BD88F",
  greenBg: "#20372B",
  red: "#FF9191",
  redBg: "#3B2428",
  info: "#182B46",
  disabled: "#25252B",
};
type Theme = {
  colors: typeof light;
  dark: boolean;
  setDark: (dark: boolean) => void;
};
const ThemeContext = createContext<Theme>({
  colors: light,
  dark: false,
  setDark: () => {},
});
export function ThemeProvider({ children }: React.PropsWithChildren) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    void AsyncStorage.getItem("booklink.theme").then((v) =>
      setIsDark(v === "dark"),
    );
  }, []);
  function setDark(value: boolean) {
    setIsDark(value);
    void AsyncStorage.setItem("booklink.theme", value ? "dark" : "light");
  }
  return (
    <ThemeContext.Provider
      value={{ colors: isDark ? dark : light, dark: isDark, setDark }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
export function Txt({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  const flattened = StyleSheet.flatten(style);
  return (
    <Text
      {...props}
      style={[
        { color: colors.text, fontSize: 14, includeFontPadding: false,
          lineHeight: Math.ceil((flattened?.fontSize ?? 14) * 1.4) },
        style,
        { fontFamily: fontFamily(flattened?.fontWeight), fontWeight: "normal" },
      ]}
    />
  );
}
export function Muted({ children }: React.PropsWithChildren) {
  const { colors } = useTheme();
  return <Txt style={{ color: colors.muted, fontSize: 13 }}>{children}</Txt>;
}
export function Icon({
  name,
  color,
}: {
  name: keyof typeof icons;
  color?: string;
}) {
  const xml = color ? icons[name].replaceAll("#15171A", color) : icons[name];
  return (
    <View
      style={{
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SvgXml xml={xml} style={{ backgroundColor: "transparent" }} />
    </View>
  );
}
export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary",
  icon,
  style,
  textStyle,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "outline" | "danger";
  icon?: keyof typeof icons;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: !!disabled || !!loading,
        busy: !!loading,
      }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: disabled
            ? colors.disabled
            : variant === "primary"
              ? colors.accent
              : colors.bg,
          borderColor:
            variant === "danger"
              ? colors.red
              : variant === "outline"
                ? colors.line
                : "transparent",
          borderWidth: variant === "primary" ? 0 : 1,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : icon ? (
        <Icon
          name={icon}
          color={disabled ? colors.hint : variant === "danger" ? colors.red : variant === "primary" ? light.text : colors.text}
        />
      ) : null}
      <Txt
        style={[{
          textAlign: "center",
          flexShrink: 1,
          fontWeight: "700",
          color: disabled
            ? colors.hint
            : variant === "danger"
              ? colors.red
              : variant === "primary"
                ? light.text
                : colors.text,
        }, textStyle]}
      >
        {title}
      </Txt>
    </Pressable>
  );
}
export function Field({
  label,
  icon,
  trailing,
  containerStyle,
  labelStyle,
  gap = 5,
  ...props
}: TextInputProps & {
  label?: string;
  icon?: keyof typeof icons;
  trailing?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  gap?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap }}>
      {label ? (
        <Txt
          style={[{
            fontWeight: "700",
            fontSize: 12,
            color: colors.muted,
          }, labelStyle]}
        >
          {label}
        </Txt>
      ) : null}
      <View
        style={[
          s.field,
          { backgroundColor: colors.surface, borderColor: colors.line },
          containerStyle,
        ]}
      >
        {icon ? <Icon name={icon} /> : null}
        <TextInput
          {...props}
          accessibilityLabel={
            props.accessibilityLabel || label || props.placeholder
          }
          placeholderTextColor={colors.hint}
          style={[
            {
              flex: 1,
              minWidth: 0,
              minHeight: 46,
              paddingVertical: 8,
              color: colors.text,
              fontSize: 15,
              includeFontPadding: false,
              lineHeight: Math.ceil((StyleSheet.flatten(props.style)?.fontSize ?? 15) * 1.4),
              textAlignVertical: "center",
            },
            props.style,
            { fontFamily: fontFamily(StyleSheet.flatten(props.style)?.fontWeight), fontWeight: "normal" },
          ]}
        />
        {trailing}
      </View>
    </View>
  );
}
export function SearchField(props: TextInputProps & { trailing?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Field
      icon={theme.dark ? "searchDark" : "search"}
      autoCapitalize="none"
      returnKeyType="search"
      clearButtonMode="while-editing"
      {...props}
    />
  );
}
export function Screen({
  title,
  back,
  children,
  refreshing,
  onRefresh,
  rows,
  titleStyle,
  headerRight,
  footer,
}: React.PropsWithChildren<{
  title?: string;
  back?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  rows?: React.ReactElement[];
  titleStyle?: StyleProp<TextStyle>;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
}>) {
  const { colors } = useTheme();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[s.header, { backgroundColor: colors.bg }]}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Назад"
            onPress={back}
            style={s.back}
          >
            <Txt style={{ fontSize: 26 }}>‹</Txt>
          </Pressable>
        ) : null}
        {title ? <Txt
          accessibilityRole="header"
          style={[{ fontSize: 20, fontWeight: "700", flex: 1 }, titleStyle]}
        >
          {title}
        </Txt> : null}
        {headerRight}
      </View>
      {rows !== undefined ? (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => String(item.key ?? index)}
          renderItem={({ item }) => <View style={{ marginTop: 14 }}>{item}</View>}
          ListHeaderComponent={<View style={{ gap: 14 }}>{children}</View>}
          contentContainerStyle={[s.body, { gap: 0 }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh}
              tintColor={colors.green} colors={[colors.green]} />
          ) : undefined}
        />
      ) : <ScrollView
        contentContainerStyle={s.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.green}
              colors={[colors.green]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>}
      {footer ? <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: colors.bg }}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}
export function Card({ children }: React.PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        s.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      {children}
    </View>
  );
}
export function Status({ text, bad = false, tone }: {
  text: string; bad?: boolean; tone?: "success" | "error" | "neutral" | "warning";
}) {
  const { colors, dark } = useTheme();
  const kind = tone ?? (bad ? "error" : "success");
  const foreground = kind === "neutral" ? colors.muted : kind === "warning" ? (dark ? "#F0B85C" : "#945500")
    : kind === "error" ? colors.red : colors.green;
  const background = kind === "neutral" ? colors.disabled : kind === "warning" ? (dark ? "#3B301E" : "#FFF0D6")
    : kind === "error" ? colors.redBg : colors.greenBg;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingVertical: 3,
        paddingHorizontal: 9,
        borderRadius: 16,
        backgroundColor: background,
      }}
    >
      <Txt
        style={{
          fontWeight: "700",
          fontSize: 12,
          color: foreground,
        }}
      >
        {text}
      </Txt>
    </View>
  );
}
export function Info({ children, neutral = false }: React.PropsWithChildren<{ neutral?: boolean }>) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: neutral ? colors.surface : colors.info,
        padding: 14,
        borderRadius: 14,
        gap: 6,
      }}
    >
      <Txt style={{ fontSize: 13 }}>{children}</Txt>
    </View>
  );
}
export function Empty({ text }: { text: string }) {
  const { dark } = useTheme();
  return (
    <View style={{ paddingVertical: 40, gap: 12, alignItems: "center" }}>
      <Icon name={dark ? "loansDark" : "loanOn"} />
      <Muted>{text}</Muted>
    </View>
  );
}
export function LoadState({
  loading,
  error,
  retry,
  data,
  variant = "default",
}: {
  loading: boolean;
  error: string;
  retry: () => void;
  data?: unknown;
  variant?: "default" | "books";
}) {
  const { colors } = useTheme();
  return (
    <>
      {loading ? variant === "books" ? <BookListSkeleton /> : (
        <View style={{ padding: 20, gap: 8 }}>
          <ActivityIndicator color={colors.green} />
          <Muted>Загрузка…</Muted>
        </View>
      ) : null}
      {error ? (
        <Card>
          <Txt style={{ color: colors.red }}>{error}</Txt>
          {data !== undefined ? <Muted>Показаны ранее загруженные данные. Не удалось обновить.</Muted> : null}
          <Button
            title="Повторить загрузку"
            onPress={retry}
            variant="outline"
          />
        </Card>
      ) : null}
    </>
  );
}
function BookListSkeleton() {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityLabel="Загрузка списка книг" accessibilityRole="progressbar" accessibilityState={{ busy: true }}>
      {Array.from({ length: 5 }, (_, index) => (
        <View key={index} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.line }}>
          <View style={{ width: 56, height: 80, borderRadius: 6, backgroundColor: colors.disabled }} />
          <View style={{ flex: 1, gap: 10 }}>
            {(["70%", "47%", "35%"] as const).map(width => (
              <View key={width} style={{ width, height: 12, borderRadius: 6, backgroundColor: colors.disabled }} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
export function Cover({
  book,
  large = false,
}: {
  book: BookShort;
  large?: boolean;
}) {
  const { colors, dark } = useTheme();
  const { server } = useSession();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [book.coverUrl]);
  let uri: string | undefined;
  try {
    if (book.coverUrl) {
      const candidate = new URL(book.coverUrl, server + "/");
      if (["https:", "http:"].includes(candidate.protocol))
        uri = candidate.toString();
    }
  } catch {}
  const geometry = {
    width: large ? 120 : 56,
    height: large ? 172 : 80,
    borderRadius: 7,
  };
  if (uri && !failed)
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={`Обложка: ${book.title}`}
        style={geometry}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  return (
    <View
      accessibilityLabel="Обложка отсутствует"
      style={[
        geometry,
        {
          backgroundColor: colors.greenBg,
          borderWidth: 1,
          borderColor: colors.line,
          alignItems: "center",
          justifyContent: "center",
          padding: 5,
          gap: 3,
        },
      ]}
    >
      <Icon name={dark ? "loansDark" : "loanOn"} />
      {large ? (
        <Txt style={{ fontSize: 11, color: colors.muted, textAlign: "center" }}>
          Нет обложки
        </Txt>
      ) : null}
    </View>
  );
}
export function BookHeading({
  book,
  large = false,
  children,
}: React.PropsWithChildren<{ book: BookShort; large?: boolean }>) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / fontScale < (large ? 340 : 230);
  return (
    <View
      style={{
        flexDirection: stacked ? "column" : "row",
        gap: large ? 16 : 12,
        alignItems: "flex-start",
      }}
    >
      <Cover book={book} large={large} />
      <View style={{ flex: stacked ? undefined : 1, width: stacked ? "100%" : undefined, gap: 4 }}>
        <Txt style={{ fontSize: large ? 21 : 15, fontWeight: "700" }}>
          {book.title}
        </Txt>
        <Muted>{book.authors}</Muted>
        {children}
      </View>
    </View>
  );
}
export function Segments({
  selected,
  options,
  onChange,
}: {
  selected: number;
  options: string[];
  onChange: (n: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        borderBottomWidth: 1,
        borderColor: colors.line,
      }}
    >
      {options.map((name, n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          accessibilityRole="tab"
          accessibilityState={{ selected: n === selected }}
          style={{
            flex: 1,
            minHeight: 48,
            justifyContent: "center",
            paddingVertical: 8,
            borderBottomWidth: 3,
            borderColor: n === selected ? colors.accent : "transparent",
          }}
        >
          <Txt
            style={{
              textAlign: "center",
              fontWeight: n === selected ? "700" : "400",
              color: n === selected ? colors.text : colors.muted,
            }}
          >
            {name}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}
export const s = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    minHeight: 64,
  },
  body: { paddingHorizontal: 16, paddingBottom: 24, gap: 14, flexGrow: 1 },
  back: { minWidth: 40, minHeight: 44, justifyContent: "center" },
  card: { padding: 14, borderRadius: 18, borderWidth: 1, gap: 10 },
  field: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
