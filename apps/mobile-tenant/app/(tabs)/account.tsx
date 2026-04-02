import { Pressable, StyleSheet, Text } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { useAuth } from "@/contexts/auth-context";

export default function AccountScreen(): React.ReactElement {
  const { session, signOut } = useAuth();

  return (
    <ScreenShell title="Compte" subtitle={session?.user.email ?? "Utilisateur connecté"}>
      <Pressable
        style={styles.button}
        onPress={() => {
          void signOut();
        }}
      >
        <Text style={styles.buttonText}>Se déconnecter</Text>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#010A19"
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700"
  }
});
