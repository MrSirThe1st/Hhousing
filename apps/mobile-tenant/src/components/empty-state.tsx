import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fontSize, fontWeight, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

const HOUSE_ILLUSTRATION = require("../../assets/house_blue.png");

export type EmptyStateIllustration = "house";

type EmptyStateProps = {
  title: string;
  body: string;
  illustration?: EmptyStateIllustration;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function EmptyState({
  title,
  body,
  illustration,
  icon,
  actionLabel,
  onAction,
  compact = false
}: EmptyStateProps): React.ReactElement {
  const { colors } = useTheme();
  const styles = createStyles(colors, compact);

  return (
    <View style={styles.root} accessibilityRole="summary">
      {illustration === "house" ? (
        <Image
          source={HOUSE_ILLUSTRATION}
          style={styles.illustration}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      ) : icon ? (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={compact ? 28 : 36} color={colors.brand} />
        </View>
      ) : null}

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>

      {actionLabel && onAction ? (
        <Pressable style={styles.action} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors, compact: boolean) {
  return StyleSheet.create({
    root: {
      alignItems: "center",
      justifyContent: "center",
      gap: compact ? 8 : 10,
      paddingHorizontal: compact ? 16 : 20,
      paddingVertical: compact ? 20 : 28,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface
    },
    illustration: {
      width: compact ? 140 : 200,
      height: compact ? 94 : 134,
      marginBottom: 4
    },
    iconWrap: {
      width: compact ? 56 : 72,
      height: compact ? 56 : 72,
      borderRadius: compact ? 28 : 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brandSoft,
      marginBottom: 4
    },
    title: {
      fontSize: compact ? fontSize.body : fontSize.title,
      fontWeight: fontWeight.semibold,
      color: colors.text,
      textAlign: "center"
    },
    body: {
      fontSize: fontSize.secondary,
      lineHeight: 20,
      color: colors.textMuted,
      textAlign: "center"
    },
    action: {
      marginTop: 6,
      minHeight: 44,
      paddingHorizontal: 18,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand
    },
    actionText: {
      color: colors.onBrand,
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.semibold
    }
  });
}
