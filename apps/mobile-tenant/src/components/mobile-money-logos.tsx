import { Image, StyleSheet, Text, View } from "react-native";

export type MobileMoneyProviderCode = "AIRTEL_COD" | "ORANGE_COD" | "VODACOM_MPESA_COD";

type ProviderMeta = {
  code: MobileMoneyProviderCode;
  label: string;
  logo: number;
  /** Wordmarks are wide; icon marks are closer to square. */
  logoWidth: number;
  logoHeight: number;
};

export const MOBILE_MONEY_PROVIDERS: ProviderMeta[] = [
  {
    code: "AIRTEL_COD",
    label: "Airtel Money",
    logo: require("../../assets/Airtel_Africa-Logo.wine.png"),
    logoWidth: 72,
    logoHeight: 22
  },
  {
    code: "ORANGE_COD",
    label: "Orange Money",
    logo: require("../../assets/Orange_Money-Logo.wine.png"),
    logoWidth: 72,
    logoHeight: 22
  },
  {
    code: "VODACOM_MPESA_COD",
    label: "M-Pesa",
    logo: require("../../assets/m-pesa-logo-png_seeklogo-622552.png"),
    logoWidth: 40,
    logoHeight: 36
  }
];

export function MobileMoneyLogo({
  code,
  size
}: {
  code: MobileMoneyProviderCode;
  /** Optional square size override (pay modal chips). */
  size?: number;
}): React.ReactElement {
  const provider = MOBILE_MONEY_PROVIDERS.find((item) => item.code === code)
    ?? MOBILE_MONEY_PROVIDERS[0]!;

  const width = size ?? provider.logoWidth;
  const height = size ?? provider.logoHeight;

  return (
    <Image
      source={provider.logo}
      style={{ width, height }}
      resizeMode="contain"
      accessibilityLabel={provider.label}
    />
  );
}

export function MobileMoneyMethodsRow(): React.ReactElement {
  return (
    <View style={styles.block}>
      <Text style={styles.heading}>MÉTHODES ACCEPTÉES :</Text>
      <View style={styles.row}>
        {MOBILE_MONEY_PROVIDERS.map((provider) => (
          <View key={provider.code} style={styles.chip}>
            <View style={styles.logoWrap}>
              <MobileMoneyLogo code={provider.code} />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {provider.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 10
  },
  heading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#9CA3AF"
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 96,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 8
  },
  logoWrap: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center"
  }
});
