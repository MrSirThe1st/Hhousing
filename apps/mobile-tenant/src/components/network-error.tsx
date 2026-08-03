import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { fontSize, useTheme } from "@/theme";

type NetworkErrorProps = {
  onRetry: () => void;
};

export function NetworkError({ onRetry }: NetworkErrorProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name="wifi-outline" size={48} color={colors.iconMuted} />
      <Text style={[styles.title, { color: colors.textSecondary }]}>{t("errors.networkTitle")}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>
        {t("errors.networkBody")}
      </Text>
      <Pressable style={[styles.retryBtn, { backgroundColor: colors.brand }]} onPress={onRetry}>
        <Text style={[styles.retryBtnText, { color: colors.onBrand }]}>{t("common.retry")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: "600"
  },
  message: {
    fontSize: fontSize.secondary,
    textAlign: "center",
    lineHeight: 20
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryBtnText: {
    fontWeight: "600",
    fontSize: fontSize.secondary
  }
});
