import React, { useState } from "react";
import { Image, Keyboard, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useDialogs } from "../dialogs";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useSession } from "../session";
import {
  Button,
  Field,
  Icon,
  Info,
  Screen,
  Txt,
  useTheme,
} from "../ui";

export function Login() {
  const { login, busy, notice, server } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const { colors, dark } = useTheme();
  async function submit() {
    if (!username.trim() || !password || busy) return;
    Keyboard.dismiss();
    setError("");
    try {
      await login(username, password);
      setPassword("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <ScrollView contentContainerStyle={loginStyles.body} keyboardShouldPersistTaps="handled">
      <View style={loginStyles.heading}>
        <View style={loginStyles.logo}>
        <Image
          accessibilityLabel="Логотип Booklink"
          source={require("../../assets/logo.png")}
          style={loginStyles.logo}
          resizeMode="contain"
        />
        <View pointerEvents="none" style={[loginStyles.logoOutline, { borderColor: colors.accent }]} />
        </View>
        <View style={loginStyles.headingText}>
        <Txt accessibilityRole="header" style={loginStyles.title}>
          Вход в Booklink
        </Txt>
        <Txt style={[loginStyles.subtitle, { color: colors.muted }]}>Библиотека техникума</Txt>
        </View>
      </View>
      {notice ? <Info>{notice}</Info> : null}
      {!server ? <Info>Сервер приложения не настроен. Обратитесь в библиотеку.</Info> : null}
      {error ? (
        <View accessibilityRole="alert" accessibilityLiveRegion="polite"
          style={[loginStyles.error, { backgroundColor: colors.redBg }]}>
          <LoginNoticeIcon color={colors.red} />
          <Txt style={[loginStyles.errorText, { color: colors.red }]}>{error.replace(/\.$/, "")}</Txt>
        </View>
      ) : null}
      <View style={loginStyles.fields}>
      <Field
        label="Логин"
        gap={0}
        containerStyle={loginStyles.field}
        labelStyle={loginStyles.label}
        style={loginStyles.input}
        icon={dark ? "userDark" : "user"}
        placeholder="Введите логин"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="username"
        editable={!busy}
      />
      <Field
        label="Пароль"
        gap={0}
        containerStyle={loginStyles.field}
        labelStyle={loginStyles.label}
        style={loginStyles.input}
        icon={dark ? "lockDark" : "lock"}
        placeholder="Введите пароль"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        editable={!busy}
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Скрыть пароль" : "Показать пароль"}
            onPress={() => setVisible((v) => !v)}
            style={{
              width: 40,
              minHeight: 44,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View>
              <Icon name={dark ? "eyeDark" : "eye"} />
              {!visible ? <Svg width={24} height={24} style={StyleSheet.absoluteFill}>
                <Line x1={2} y1={2} x2={22} y2={22} stroke={colors.muted} strokeWidth={2} strokeLinecap="round" />
              </Svg> : null}
            </View>
          </Pressable>
        }
      />
      </View>
      <Button
        title="Войти"
        onPress={() => void submit()}
        loading={busy}
        disabled={!server || !username.trim() || !password}
        style={loginStyles.button}
        textStyle={loginStyles.buttonText}
      />
    </ScrollView>
  );
}

function LoginNoticeIcon({ color }: { color: string }) {
  const size = 20;
  return <View style={{ width: size, height: 22, justifyContent: "center" }}>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={8.5} stroke={color} strokeWidth={2} />
      <Line x1={10} y1={5.5} x2={10} y2={10.5} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={10} cy={14} r={1} fill={color} />
    </Svg>
  </View>;
}

const loginStyles = StyleSheet.create({
  body: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 55, paddingBottom: 32 },
  heading: { alignItems: "center", marginBottom: 18 },
  logo: { width: 114, height: 114 },
  logoOutline: { position: "absolute", top: 8, bottom: 8, left: 9, right: 9, borderRadius: 24, borderWidth: 1.2 },
  headingText: { alignItems: "center", marginTop: 24 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 16, lineHeight: 22, textAlign: "center" },
  error: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, marginBottom: 16 },
  errorText: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: "700" },
  fields: { gap: 20 },
  label: { fontSize: 14, lineHeight: 18 },
  field: { minHeight: 54, borderRadius: 10, paddingHorizontal: 14 },
  input: { fontSize: 16, minHeight: 52 },
  button: { minHeight: 56, borderRadius: 7, marginTop: 34 },
  buttonText: { fontSize: 16, lineHeight: 22 },
});
export function Account() {
  const { showDialog } = useDialogs();
  const { session, logout, busy, pending } = useSession();
  const { colors, dark, setDark } = useTheme();
  const librarian = session?.user.role === "Librarian";
  const role = librarian ? "Библиотекарь" : "Студент";
  return <Screen title="Аккаунт">
    <View style={profileStyles.identity}>
      <View style={[profileStyles.avatar, { backgroundColor: colors.disabled }]}>
        <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
          <Circle cx={24} cy={15} r={9} stroke={colors.hint} strokeWidth={1.8} />
          <Path d="M6 44c0-10 8-15 18-15s18 5 18 15" stroke={colors.hint} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      </View>
      <Txt style={profileStyles.name}>{session?.user.name}</Txt>
      <View style={[profileStyles.role, { backgroundColor: colors.info }]}>
        <Txt style={{ color: dark ? "#82B1FF" : "#246BE3", fontSize: 13, fontWeight: "700", textAlign: "center" }}>{role}</Txt>
      </View>
    </View>
    <View style={[profileStyles.panel, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <ProfileRow label="Имя" value={session?.user.name ?? "—"} />
      <ProfileRow label="Логин" value={session?.user.login ?? "—"} />
      <ProfileRow label="Роль" value={role} last />
    </View>
    <View style={[profileStyles.panel, { backgroundColor: colors.surface, borderColor: colors.line, paddingVertical: 14, gap: 12 }]}>
      <Txt style={{ fontSize: 15, fontWeight: "700" }}>Тема приложения</Txt>
      <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Тема приложения">
        {[{ title: "Светлая", icon: "sun" as const }, { title: "Тёмная", icon: "moon" as const }].map((option, index) => {
          const selected = dark === (index === 1);
          return <Pressable key={option.title} accessibilityRole="radio" accessibilityLabel={option.title + " тема"}
            accessibilityState={{ checked: selected }} onPress={() => setDark(index === 1)}
            style={({ pressed }) => [profileStyles.themeOption, {
              backgroundColor: selected ? colors.accent : colors.bg,
              borderColor: selected ? colors.accent : colors.line, opacity: pressed ? 0.7 : 1,
            }]}>
            <Icon name={option.icon} color={selected ? "#15171A" : colors.muted} />
            <Txt style={{ color: selected ? "#15171A" : colors.text, fontSize: 14, fontWeight: selected ? "700" : "400", textAlign: "center", flexShrink: 1 }}>{option.title}</Txt>
          </Pressable>;
        })}
      </View>
    </View>
    <Button title="Выйти из аккаунта" icon="logout" variant="danger" disabled={busy}
      style={{ marginTop: 6 }} textStyle={{ fontSize: 16 }}
      onPress={() => showDialog({
        title: "Выйти из аккаунта?", tone: "warning",
        message: pending
          ? "Останется неподтверждённая операция. После входа проверьте её состояние у сервера."
          : "Для продолжения потребуется повторный вход.",
        primary: { title: "Выйти", destructive: true, onPress: () => void logout() },
        secondary: { title: "Остаться" },
      })} />
  </Screen>;
}

function ProfileRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / fontScale < 300;
  return <View style={{ flexDirection: stacked ? "column" : "row", gap: stacked ? 4 : 20,
    alignItems: stacked ? "stretch" : "center", paddingVertical: 13,
    borderBottomWidth: last ? 0 : 1, borderColor: colors.line }}>
    <Txt style={{ color: colors.muted, fontSize: 14 }}>{label}</Txt>
    <Txt selectable style={{ flex: stacked ? undefined : 1, fontSize: 14, fontWeight: "700", textAlign: stacked ? "left" : "right" }}>{value}</Txt>
  </View>;
}

const profileStyles = StyleSheet.create({
  identity: { alignItems: "center", paddingTop: 18, paddingBottom: 10, gap: 10 },
  avatar: { width: 92, height: 92, borderRadius: 46, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  name: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  role: { borderRadius: 16, paddingVertical: 3, paddingHorizontal: 24, minWidth: 112 },
  panel: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 2 },
  themeOption: { flex: 1, minHeight: 46, borderRadius: 7, borderWidth: 1, flexDirection: "row",
    justifyContent: "center", alignItems: "center", paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
});
