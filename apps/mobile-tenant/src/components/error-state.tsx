import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { fontSize, fontWeight, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";
import { userFacingError } from "@/lib/user-facing-error";

type ErrorStateProps = {
  onRetry: () => void;
  code?: string | null;
  error?: string | null;
  offline?: boolean;
};

export function ErrorState({
  onRetry,
  code,
  error,
  offline
}: ErrorStateProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isOffline = offline || code === "NETWORK_ERROR";
  const copy = userFacingError({ code, error, offline: isOffline, t });

  return (
    <View style={styles.root} accessibilityRole="alert">
      <View style={styles.iconWrap}>
        <Ionicons
          name={isOffline ? "cloud-offline-outline" : "alert-circle-outline"}
          size={36}
          color={isOffline ? colors.iconMuted : colors.danger}
        />
      </View>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      <Pressable style={styles.retry} onPress={onRetry}>
        <Text style={styles.retryText}>{t("common.retry")}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 28,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.backgroundAlt,
      marginBottom: 4
    },
    title: {
      fontSize: fontSize.title,
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
    retry: {
      marginTop: 6,
      minHeight: 44,
      paddingHorizontal: 18,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand
    },
    retryText: {
      color: colors.onBrand,
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.semibold
    }
  });
}
