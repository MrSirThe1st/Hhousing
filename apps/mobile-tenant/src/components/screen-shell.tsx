import type { PropsWithChildren } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";

type ScreenShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function ScreenShell({ children }: ScreenShellProps): React.ReactElement {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff"
  },
  content: {
    flex: 1,
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: 24
  }
});
