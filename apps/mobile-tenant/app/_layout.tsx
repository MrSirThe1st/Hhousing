import { Redirect, Slot, useSegments } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

function RootNavigator(): React.ReactElement {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const isAuthRoute = segments[0] === "(auth)";

  if (isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#0063FE" />
      </View>
    );
  }

  if (!session && !isAuthRoute) {
    return <Redirect href="/(auth)/login" />;
  }

  if (session && isAuthRoute) {
    return <Redirect href="/(tabs)" />;
  }

  return <Slot />;
}

export default function RootLayout(): React.ReactElement {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff"
  }
});
