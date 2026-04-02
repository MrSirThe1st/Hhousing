import { Text } from "react-native";
import { ScreenShell } from "@/components/screen-shell";

export default function PaymentsScreen(): React.ReactElement {
  return (
    <ScreenShell
      title="Paiements"
      subtitle="Historique et prochains paiements."
    >
      <Text>MVP: vue paiements en lecture seule (prochain slice).</Text>
    </ScreenShell>
  );
}
