import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type NetworkErrorProps = {
  onRetry: () => void;
};

export function NetworkError({ onRetry }: NetworkErrorProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Ionicons name="wifi-outline" size={48} color="#9CA3AF" />
      <Text style={styles.title}>Pas de connexion</Text>
      <Text style={styles.message}>Vérifiez votre connexion internet et réessayez.</Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryBtnText}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151"
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center"
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: "#0063FE",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14
  }
});
