import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontWeight, fontSize, spacing, touchTarget, useTheme } from "@/theme";

type PageHeaderProps = {
  title: string;
  onBack: () => void;
};

export function PageHeader({ title, onBack }: PageHeaderProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.backBtn, { backgroundColor: colors.brandSoft }]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Retour"
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={22} color={colors.brand} />
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.trailingSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
    minHeight: touchTarget
  },
  backBtn: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: touchTarget / 2,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    flex: 1,
    fontSize: fontSize.title,
    fontWeight: fontWeight.semibold,
    textAlign: "center"
  },
  trailingSpacer: {
    width: touchTarget
  }
});
