import { useMemo } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/contexts/preferences-context";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type ToggleRowProps = {
  icon: IoniconName;
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
};

function ToggleRow({
  icon,
  label,
  hint,
  value,
  onValueChange,
  colors,
  styles
}: ToggleRowProps): React.ReactElement {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color={colors.brand} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
        thumbColor={value ? colors.brand : colors.switchThumbOff}
      />
    </View>
  );
}

export default function NotificationsSettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { notifyInvoices, notifyRentDue, setNotifyInvoices, setNotifyRentDue } = usePreferences();

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => { router.back(); }} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </Pressable>
        <Text style={styles.topTitle}>{t("settings.notifications")}</Text>
        <View style={styles.topSpacer} />
      </View>
      <View style={styles.headerRule} />

      <View style={styles.list}>
        <ToggleRow
          icon="receipt-outline"
          label={t("settings.invoices")}
          hint={t("settings.invoicesHint")}
          value={notifyInvoices}
          onValueChange={(next) => { void setNotifyInvoices(next); }}
          colors={colors}
          styles={styles}
        />
        <View style={styles.separator} />
        <ToggleRow
          icon="calendar-outline"
          label={t("settings.rentDue")}
          hint={t("settings.rentDueHint")}
          value={notifyRentDue}
          onValueChange={(next) => { void setNotifyRentDue(next); }}
          colors={colors}
          styles={styles}
        />
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background
    },
    topBar: {
      minHeight: 48,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center"
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center"
    },
    topTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: colors.text
    },
    topSpacer: { width: 40 },
    headerRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border
    },
    list: {
      marginTop: 4
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 20,
      minHeight: 62,
      backgroundColor: colors.background
    },
    rowCopy: {
      flex: 1,
      gap: 2
    },
    rowLabel: {
      fontSize: fontSize.body,
      color: colors.textSecondary,
      fontWeight: "500"
    },
    rowHint: {
      fontSize: fontSize.caption,
      color: colors.textFaint
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 56
    }
  });
}
