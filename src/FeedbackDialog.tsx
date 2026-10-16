import React from "react";
import { Modal, ScrollView, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Button, Txt, useTheme } from "./ui";

export type DialogTone = "success" | "error" | "warning" | "info";
type DialogAction = { title: string; onPress: () => void; destructive?: boolean };

export function FeedbackDialog({ visible, close, title, message, warning = false, tone, clock = false, primary, secondary }: {
  visible: boolean;
  close: () => void;
  title: string;
  message: string;
  warning?: boolean;
  tone?: DialogTone;
  clock?: boolean;
  primary: DialogAction;
  secondary?: DialogAction;
}) {
  const { colors, dark } = useTheme();
  const kind = tone ?? (warning ? "error" : "success");
  const iconColor = kind === "warning" ? (dark ? "#F0B85C" : "#B87308")
    : kind === "info" ? (dark ? "#82B1FF" : "#246BE3") : kind === "error" ? colors.red : colors.green;
  const iconBg = kind === "warning" ? (dark ? "#3B301E" : "#F7EBD9")
    : kind === "info" ? colors.info : kind === "error" ? colors.redBg : colors.greenBg;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
    <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 }}>
      <ScrollView
        style={{ width: "100%", maxWidth: 360, maxHeight: "90%", flexGrow: 0, borderRadius: 20, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: 24, gap: 24 }} accessibilityViewIsModal>
        <View style={{ alignItems: "center", gap: 16 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
            <Svg width={28} height={28} viewBox="0 0 28 28">
              {kind === "warning"
                ? <Path d="M12.3 4.4a2 2 0 0 1 3.4 0l9 16a2 2 0 0 1-1.7 3H5a2 2 0 0 1-1.7-3Z" stroke={iconColor} strokeWidth={2} strokeLinejoin="round" fill="none" />
                : <Circle cx={14} cy={14} r={10} stroke={iconColor} strokeWidth={2} fill="none" />}
              {kind === "error" || kind === "warning" ? <>
                <Path d="M14 8v7" stroke={iconColor} strokeWidth={2} strokeLinecap="round" />
                <Circle cx={14} cy={19} r={1.2} fill={iconColor} />
              </> : clock ? <Path d="M14 7v7l4 3" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                : <Path d="m10 14 3 3 5-6" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
            </Svg>
          </View>
          <View style={{ gap: 8 }}>
            <Txt accessibilityRole="header" style={{ fontSize: 20, fontWeight: "700", textAlign: "center" }}>{title}</Txt>
            <Txt style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>{message}</Txt>
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Button title={primary.title} onPress={primary.onPress}
            style={primary.destructive ? { backgroundColor: "#C62828" } : undefined}
            textStyle={primary.destructive ? { color: "#FFFFFF" } : undefined} />
          {secondary ? <Button {...secondary} variant="outline" /> : null}
        </View>
      </ScrollView>
    </View>
  </Modal>;
}
