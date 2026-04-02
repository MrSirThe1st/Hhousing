import type { PropsWithChildren } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

type ScreenShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function ScreenShell({ title, subtitle, children }: ScreenShellProps): React.ReactElement {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingTop: 16
  },
  header: {
    gap: 8,
    marginBottom: 16
  },
  title: {
    color: "#010A19",
    fontSize: 26,
    fontWeight: "700"
  },
  subtitle: {
    color: "#4B5563",
    fontSize: 14
  },
  content: {
    flex: 1,
    gap: 12
  }
});
