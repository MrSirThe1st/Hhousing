import { Text } from "react-native";
import { ScreenShell } from "@/components/screen-shell";

export default function HomeScreen(): React.ReactElement {
  return (
    <ScreenShell
      title="Accueil"
      subtitle="Bienvenue dans votre espace locataire."
    >
      <Text>Vos infos essentielles apparaîtront ici.</Text>
    </ScreenShell>
  );
}
