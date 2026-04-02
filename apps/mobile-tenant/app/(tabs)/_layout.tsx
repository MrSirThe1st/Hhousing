import { Tabs } from "expo-router";

export default function TabsLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: {
          color: "#010A19",
          fontWeight: "700"
        },
        tabBarActiveTintColor: "#0063FE",
        tabBarInactiveTintColor: "#6B7280"
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Accueil" }} />
      <Tabs.Screen name="lease" options={{ title: "Bail" }} />
      <Tabs.Screen name="maintenance" options={{ title: "Maintenance" }} />
      <Tabs.Screen name="payments" options={{ title: "Paiements" }} />
      <Tabs.Screen name="account" options={{ title: "Compte" }} />
    </Tabs>
  );
}
