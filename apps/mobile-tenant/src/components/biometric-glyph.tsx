import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import type { BiometricModality } from "@/lib/biometrics";

type BiometricGlyphProps = {
  modality: BiometricModality;
  size?: number;
  color: string;
};

/**
 * Official Apple SF Symbols on iOS (`faceid` / `touchid`).
 * Ionicons fallback on Android / web.
 */
export function BiometricGlyph({
  modality,
  size = 48,
  color
}: BiometricGlyphProps): React.ReactElement {
  if (modality === "biometric") {
    return (
      <View style={styles.row}>
        <BiometricGlyph modality="face" size={size * 0.85} color={color} />
        <BiometricGlyph modality="fingerprint" size={size * 0.85} color={color} />
      </View>
    );
  }

  if (Platform.OS === "ios") {
    const name = modality === "face" ? "faceid" : "touchid";
    return (
      <SymbolView
        name={name}
        size={size}
        tintColor={color}
        weight="regular"
        resizeMode="scaleAspectFit"
        // Android/web no-op path if this tree ever renders off iOS.
        fallback={<Ionicons name={fallbackIcon(modality)} size={size} color={color} />}
      />
    );
  }

  return <Ionicons name={fallbackIcon(modality)} size={size} color={color} />;
}

function fallbackIcon(modality: Exclude<BiometricModality, "biometric">): "scan-outline" | "finger-print-outline" {
  return modality === "face" ? "scan-outline" : "finger-print-outline";
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  }
});
