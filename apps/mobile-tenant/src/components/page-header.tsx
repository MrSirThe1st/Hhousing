import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontWeight, fontSize, useTheme } from "@/theme";

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
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={22} color={colors.brand} />
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    flex: 1,
    fontSize: fontSize.title,
    fontWeight: fontWeight.semibold
  }
});
