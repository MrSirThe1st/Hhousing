import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type PageHeaderProps = {
  title: string;
  onBack: () => void;
};

export function PageHeader({ title, onBack }: PageHeaderProps): React.ReactElement {
  return (
    <View style={styles.row}>
      <Pressable style={styles.backBtn} onPress={onBack} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color="#0063FE" />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
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
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#010A19"
  }
});
