import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index"
};

export default function AccountLayout(): React.ReactElement {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="lease" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="support" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="language" />
      <Stack.Screen name="about" />
      <Stack.Screen name="delete-account" />
    </Stack>
  );
}
