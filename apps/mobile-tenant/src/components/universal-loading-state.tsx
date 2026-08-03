import { useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { useTranslation } from "react-i18next";
import { fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type LoaderTone = "brand" | "onBrand";
type LoaderSize = "small" | "large";

type AppLoaderProps = {
  /** Default: brand blue. Use onBrand for spinners on blue buttons. */
  tone?: LoaderTone;
  size?: LoaderSize;
  style?: StyleProp<ViewStyle>;
};

/**
 * Brand-blue spinner only — for buttons / compact inline use.
 * For full-page loads, use ScreenLoader so position stays consistent.
 */
export function AppLoader({
  tone = "brand",
  size = "large",
  style
}: AppLoaderProps): React.ReactElement {
  const { colors } = useTheme();
  const color = tone === "onBrand" ? colors.onBrand : colors.brand;

  return (
    <ActivityIndicator
      size={size}
      color={color}
      style={style}
      accessibilityRole="progressbar"
    />
  );
}

/**
 * Full-area page loader. Always centers in the available flex space with no
 * padding offsets — use this (and only this) for screen-level loading.
 */
export function ScreenLoader({
  message
}: {
  message?: string;
}): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={styles.screenLoader}
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? t("common.loading")}
    >
      <AppLoader size="large" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

/** Full-page blocker while routing / gates resolve. */
export function BlockingLoadingScreen({
  message
}: {
  message?: string;
}): React.ReactElement {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.blockingScreen}>
      <ScreenLoader message={message} />
    </View>
  );
}

/** Modal overlay that blocks taps while an action runs (e.g. login). */
export function FullScreenLoadingOverlay({
  visible,
  message
}: {
  visible: boolean;
  message?: string;
}): React.ReactElement | null {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View
        style={styles.overlay}
        pointerEvents="auto"
        accessibilityRole="progressbar"
        accessibilityLabel={message ?? t("common.loading")}
      >
        <AppLoader size="large" />
        {message ? <Text style={styles.overlayMessage}>{message}</Text> : null}
      </View>
    </Modal>
  );
}

/** @deprecated Use ScreenLoader / AppLoader. */
export function UniversalLoadingState({
  message
}: {
  size?: "default" | "compact";
  message?: string;
}): React.ReactElement {
  return <ScreenLoader message={message} />;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screenLoader: {
      flex: 1,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      gap: 16
    },
    message: {
      color: colors.textSecondary,
      fontSize: fontSize.secondary,
      fontWeight: "600",
      textAlign: "center",
      paddingHorizontal: 24
    },
    overlayMessage: {
      color: colors.onBrand,
      fontSize: fontSize.secondary,
      fontWeight: "600",
      textAlign: "center",
      paddingHorizontal: 24,
      marginTop: 16
    },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "center"
    },
    blockingScreen: {
      flex: 1,
      backgroundColor: colors.background
    }
  });
}
