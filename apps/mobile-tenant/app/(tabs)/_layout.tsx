import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme";
// import { useInbox } from "@/contexts/inbox-context";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IoniconName, focusedName: IoniconName) {
  return ({ color, focused }: { color: string; focused: boolean }): React.ReactElement => (
    <Ionicons name={focused ? focusedName : name} size={24} color={color} />
  );
}

export default function TabsLayout(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // const { unreadCount } = useInbox();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerTitleStyle: {
          color: colors.text,
          fontWeight: "700"
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t("tabs.home"), tabBarIcon: tabIcon("home-outline", "home") }}
      />
      <Tabs.Screen
        name="payments"
        options={{ title: t("tabs.payments"), tabBarIcon: tabIcon("card-outline", "card") }}
      />
      {/* Hidden for now — re-enable when maintenance is ready */}
      <Tabs.Screen
        name="maintenance"
        options={{ href: null }}
      />
      {/* Hidden for now — re-enable when inbox/messages is ready */}
      <Tabs.Screen
        name="messages"
        options={{ href: null }}
        // options={{
        //   title: t("tabs.messages"),
        //   tabBarIcon: tabIcon("chatbubble-outline", "chatbubble"),
        //   tabBarBadge: unreadCount > 0 ? unreadCount : undefined
        // }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("tabs.settings"),
          tabBarIcon: tabIcon("settings-outline", "settings")
        }}
        listeners={{
          tabPress: (event) => {
            // Always open settings root — don't restore nested routes like /documents
            event.preventDefault();
            router.replace("/(tabs)/account");
          }
        }}
      />
    </Tabs>
  );
}
