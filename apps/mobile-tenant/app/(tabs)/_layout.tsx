import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IoniconName, focusedName: IoniconName) {
  return ({ color, focused }: { color: string; focused: boolean }): React.ReactElement => (
    <Ionicons name={focused ? focusedName : name} size={24} color={color} />
  );
}

export default function TabsLayout(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs
      initialRouteName="index"
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
      {/* Visual order: Paiements | Accueil (center) | Menu */}
      <Tabs.Screen
        name="payments"
        options={{ title: t("tabs.payments"), tabBarIcon: tabIcon("card-outline", "card") }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          // Grid = hub / overview (Accueil as product home, not a house icon)
          tabBarIcon: tabIcon("grid-outline", "grid")
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("tabs.menu"),
          tabBarIcon: tabIcon("settings-outline", "settings")
        }}
        listeners={{
          tabPress: (event) => {
            // Always open the menu root — don't restore nested account routes
            event.preventDefault();
            router.replace("/(tabs)/account");
          }
        }}
      />
      {/* Support feature — reachable from Accueil + Menu, not a primary tab */}
      <Tabs.Screen
        name="services"
        options={{ href: null }}
      />
    </Tabs>
  );
}
