import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme";

type ScreenShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function ScreenShell({ children }: ScreenShellProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  content: {
    flex: 1,
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: 24
  }
});
