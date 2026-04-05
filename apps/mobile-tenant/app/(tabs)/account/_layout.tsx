import { Stack } from "expo-router";

export default function AccountLayout(): React.ReactElement {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="lease" />
      <Stack.Screen name="documents" />
    </Stack>
  );
}
