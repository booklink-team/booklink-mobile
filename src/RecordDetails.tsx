import React from "react";
import { View, useWindowDimensions } from "react-native";
import { date } from "./dates";
import { Txt, useTheme } from "./ui";

export function RecordDate({ label, value, prominent = false, bad = false }: {
  label: string; value: string; prominent?: boolean; bad?: boolean;
}) {
  const { colors } = useTheme();
  const parsed = new Date(value);
  const valid = Number.isFinite(parsed.getTime());
  const day = valid ? new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow", day: "numeric", month: "short", year: "numeric",
  }).format(parsed).replace(/\s*г\.$/, "") : "—";
  const time = valid ? new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(parsed) : "—";
  return <View accessible accessibilityLabel={`${label}: ${date(value)}, московское время`} style={{ gap: 3 }}>
    <Txt style={{ fontSize: 11, color: colors.muted }}>{label}</Txt>
    <Txt style={{ fontSize: prominent ? 15 : 13, fontWeight: prominent ? "700" : "400", color: bad ? colors.red : prominent ? colors.text : colors.muted }}>{day}</Txt>
    <Txt style={{ fontSize: 12, color: bad ? colors.red : colors.muted }}>{time} · МСК</Txt>
  </View>;
}

export function DetailRow({ label, value, last = false, bad = false }: { label: string; value: string; last?: boolean; bad?: boolean }) {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / fontScale < 340;
  return <View style={{ flexDirection: stacked ? "column" : "row", alignItems: stacked ? "stretch" : "center",
    gap: stacked ? 4 : 12, paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderColor: colors.line }}>
    <Txt style={{ fontSize: 12, color: colors.muted }}>{label}</Txt>
    <Txt selectable style={{ flex: stacked ? undefined : 1, fontSize: 13, fontWeight: "700", color: bad ? colors.red : colors.text, textAlign: stacked ? "left" : "right" }}>{value}</Txt>
  </View>;
}
