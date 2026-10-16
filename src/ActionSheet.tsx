import React, { useLayoutEffect, useRef } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Txt, useTheme } from "./ui";
import { icons } from "./icons";

export function ActionSheet({ visible, title, subtitle, close, actions }: {
  visible: boolean;
  title: string;
  subtitle?: string;
  close: () => void;
  actions: { title: string; icon: keyof typeof icons; danger?: boolean; disabled?: boolean; onPress: () => void }[];
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const offset = useRef(new Animated.Value(height)).current;
  useLayoutEffect(() => {
    offset.setValue(visible ? height : 0);
    if (!visible) return;
    const animation = Animated.timing(offset, {
      toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [visible, height, offset]);
  return <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
    <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={close} />
      <Animated.ScrollView accessibilityViewIsModal
        style={{ maxHeight: "90%", flexGrow: 0, backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, transform: [{ translateY: offset }] }}
        contentContainerStyle={{ padding: 20, paddingBottom: Math.max(16, insets.bottom + 8), gap: 8 }}>
        <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: "center", marginTop: -8 }} />
        <View style={{ gap: 4 }}>
          <Txt accessibilityRole="header" style={{ fontSize: 20, fontWeight: "700" }}>{title}</Txt>
          {subtitle ? <Txt style={{ color: colors.muted, fontSize: 13 }}>{subtitle}</Txt> : null}
        </View>
        {actions.map(action => <Pressable key={action.title} accessibilityRole="button" accessibilityLabel={action.title}
          accessibilityState={{ disabled: !!action.disabled }} disabled={action.disabled} onPress={action.onPress}
          style={({ pressed }) => ({ flexDirection: "row", gap: 12, alignItems: "center", minHeight: 48, opacity: action.disabled ? 0.4 : pressed ? 0.6 : 1 })}>
          <Icon name={action.icon} color={action.danger ? colors.red : colors.text} />
          <Txt style={{ flex: 1, fontSize: 16, fontWeight: "700", color: action.danger ? colors.red : colors.text }}>{action.title}</Txt>
        </Pressable>)}
      </Animated.ScrollView>
    </View>
  </Modal>;
}
