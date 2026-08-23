import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "@/components/page-header";
import { fontSize, spacing, useTheme } from "@/theme";

type ScreenShellProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  onBack?: () => void;
}>;

export function ScreenShell({
  title,
  subtitle,
  onBack,
  children
}: ScreenShellProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.content}>
        {title && onBack ? <PageHeader title={title} onBack={onBack} /> : null}
        {title && !onBack ? (
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  content: {
    flex: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: "600"
  },
  subtitle: {
    fontSize: fontSize.secondary,
    lineHeight: 20
  }
});
