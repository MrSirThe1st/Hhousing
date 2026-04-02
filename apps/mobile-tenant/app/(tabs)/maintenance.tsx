import { Text } from "react-native";
import { ScreenShell } from "@/components/screen-shell";

export default function MaintenanceScreen(): React.ReactElement {
  return (
    <ScreenShell
      title="Maintenance"
      subtitle="Soumettre et suivre vos demandes."
    >
      <Text>MVP: formulaire de soumission à brancher au prochain slice.</Text>
    </ScreenShell>
  );
}
