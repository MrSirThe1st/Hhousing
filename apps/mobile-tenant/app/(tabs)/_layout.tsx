import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useInbox } from "@/contexts/inbox-context";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IoniconName, focusedName: IoniconName) {
  return ({ color, focused }: { color: string; focused: boolean }): React.ReactElement => (
    <Ionicons name={focused ? focusedName : name} size={24} color={color} />
  );
}

export default function TabsLayout(): React.ReactElement {
  const { unreadCount } = useInbox();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerTitleStyle: {
          color: "#010A19",
          fontWeight: "700"
        },
        tabBarActiveTintColor: "#0063FE"
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Accueil", tabBarIcon: tabIcon("home-outline", "home") }}
      />
      <Tabs.Screen
        name="payments"
        options={{ title: "Paiements", tabBarIcon: tabIcon("card-outline", "card") }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{ title: "Maintenance", tabBarIcon: tabIcon("construct-outline", "construct") }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Inbox",
          tabBarIcon: tabIcon("chatbubble-outline", "chatbubble"),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined
        }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Profil", tabBarIcon: tabIcon("person-outline", "person") }}
      />
    </Tabs>
  );
}
