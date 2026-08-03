import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme";

type SensitiveAmountProps = {
  value: string;
  revealed: boolean;
  onToggle?: () => void;
  /** When false, only the masked/revealed text is shown (no eye). */
  showToggle?: boolean;
  /** Amount text style (size/color/weight). */
  style?: StyleProp<TextStyle>;
  /** Eye icon color. Defaults to muted. */
  eyeColor?: string;
  eyeSize?: number;
};

/** Replace digits with asterisks; keep separators and currency code. */
export function maskSensitiveAmount(formatted: string): string {
  return formatted.replace(/\d/g, "*");
}

function useAmountRevealAnimation(revealed: boolean): {
  eyeScale: Animated.Value;
  openOpacity: Animated.Value;
  closedOpacity: Animated.AnimatedInterpolation<string | number>;
  amountOpacity: Animated.Value;
} {
  const eyeScale = useRef(new Animated.Value(1)).current;
  const lid = useRef(new Animated.Value(revealed ? 1 : 0)).current;
  const amountOpacity = useRef(new Animated.Value(1)).current;
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      lid.setValue(revealed ? 1 : 0);
      return;
    }

    Animated.parallel([
      Animated.sequence([
        Animated.timing(eyeScale, {
          toValue: 0.72,
          duration: 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        }),
        Animated.spring(eyeScale, {
          toValue: 1,
          friction: 4,
          tension: 220,
          useNativeDriver: true
        })
      ]),
      Animated.timing(lid, {
        toValue: revealed ? 1 : 0,
        duration: 180,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.sequence([
        Animated.timing(amountOpacity, {
          toValue: 0.35,
          duration: 90,
          useNativeDriver: true
        }),
        Animated.timing(amountOpacity, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true
        })
      ])
    ]).start();
  }, [revealed, eyeScale, lid, amountOpacity]);

  const closedOpacity = lid.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0]
  });

  return { eyeScale, openOpacity: lid, closedOpacity, amountOpacity };
}

/** Standalone eye toggle — place far right in a header/row. */
export function AmountRevealToggle({
  revealed,
  onToggle,
  eyeColor,
  eyeSize = 22
}: {
  revealed: boolean;
  onToggle: () => void;
  eyeColor?: string;
  eyeSize?: number;
}): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const iconColor = eyeColor ?? colors.textMuted;
  const { eyeScale, openOpacity, closedOpacity } = useAmountRevealAnimation(revealed);

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={revealed ? t("common.hideAmount") : t("common.revealAmount")}
      style={styles.eyeBtn}
    >
      <Animated.View style={{ transform: [{ scale: eyeScale }] }}>
        <View style={[styles.eyeStack, { width: eyeSize, height: eyeSize }]}>
          <Animated.View style={[styles.eyeLayer, { opacity: closedOpacity }]}>
            <Ionicons name="eye-off-outline" size={eyeSize} color={iconColor} />
          </Animated.View>
          <Animated.View style={[styles.eyeLayer, { opacity: openOpacity }]}>
            <Ionicons name="eye-outline" size={eyeSize} color={iconColor} />
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function SensitiveAmount({
  value,
  revealed,
  onToggle,
  showToggle = true,
  style,
  eyeColor,
  eyeSize = 22
}: SensitiveAmountProps): React.ReactElement {
  const { t } = useTranslation();
  const { amountOpacity } = useAmountRevealAnimation(revealed);
  const display = revealed ? value : maskSensitiveAmount(value);

  return (
    <View style={[styles.row, showToggle && onToggle ? styles.rowWithToggle : null]}>
      <Animated.Text
        style={[styles.amount, style, { opacity: amountOpacity }]}
        numberOfLines={1}
        accessibilityLabel={revealed ? value : t("common.amountHidden")}
      >
        {display}
      </Animated.Text>

      {showToggle && onToggle ? (
        <AmountRevealToggle
          revealed={revealed}
          onToggle={onToggle}
          eyeColor={eyeColor}
          eyeSize={eyeSize}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center"
  },
  rowWithToggle: {
    width: "100%",
    justifyContent: "space-between",
    gap: 12
  },
  amount: {
    flexShrink: 1
  },
  eyeBtn: {
    marginLeft: "auto",
    paddingVertical: 4,
    paddingHorizontal: 2,
    justifyContent: "center",
    alignItems: "center"
  },
  eyeStack: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center"
  },
  eyeLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center"
  }
});
