import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native";
import animationDataSource from "./material-wave-loading.json";

type MaterialWaveKeyframe = {
  t: number;
  s?: [number, number, number];
};

type MaterialWaveLayer = {
  ks: {
    p: {
      k: MaterialWaveKeyframe[];
    };
  };
  shapes: Array<{
    it: Array<{
      c?: {
        k: [number, number, number, number];
      };
      s?: {
        k: [number, number];
      };
    }>;
  }>;
};

type MaterialWaveAnimationData = {
  fr: number;
  op: number;
  layers: MaterialWaveLayer[];
};

type LoaderDot = {
  color: string;
  delayMs: number;
  size: number;
  x: number;
};

const animationData = animationDataSource as unknown as MaterialWaveAnimationData;

function getRgbColorString(color: [number, number, number, number]): string {
  const [red, green, blue] = color;
  return `rgb(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)})`;
}

function getLoaderDots(size: "default" | "compact"): LoaderDot[] {
  const durationMs = (animationData.op / animationData.fr) * 1000;

  return animationData.layers
    .map((layer) => {
      const keyframes = layer.ks.p.k;
      const firstFrame = keyframes[0];
      const colorToken = layer.shapes[0]?.it.find((item) => item.c)?.c;
      const ellipseSize = layer.shapes[0]?.it.find((item) => item.s)?.s;
      const baseSize = Math.round((ellipseSize?.k[0] ?? 33.75) * 0.75);

      return {
        color: getRgbColorString(colorToken?.k ?? [0.1176471, 0.5333334, 0.8980392, 1]),
        delayMs: ((firstFrame?.t ?? 0) / animationData.fr) * 1000,
        size: size === "compact" ? Math.max(12, Math.round(baseSize * 0.62)) : baseSize,
        x: firstFrame?.s?.[0] ?? 0
      };
    })
    .sort((left, right) => left.x - right.x)
    .map((dot) => ({
      ...dot,
      // Negative delay equivalent: start mid-cycle like the web CSS animationDelay.
      delayMs: (durationMs - (dot.delayMs % durationMs)) % durationMs
    }));
}

function WaveDot({
  color,
  size,
  travel,
  durationMs,
  delayMs
}: {
  color: string;
  size: number;
  travel: number;
  durationMs: number;
  delayMs: number;
}): React.ReactElement {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -travel,
          duration: durationMs * 0.25,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: durationMs * 0.25,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: durationMs * 0.5,
          useNativeDriver: true
        })
      ])
    );

    const timeout = setTimeout(() => {
      loop.start();
    }, delayMs);

    return () => {
      clearTimeout(timeout);
      loop.stop();
      translateY.stopAnimation();
    };
  }, [delayMs, durationMs, translateY, travel]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ translateY }]
      }}
    />
  );
}

export function UniversalLoadingState({
  size = "default",
  message
}: {
  size?: "default" | "compact";
  message?: string;
}): React.ReactElement {
  const dots = useMemo(() => getLoaderDots(size), [size]);
  const durationMs = (animationData.op / animationData.fr) * 1000;
  const travel = size === "compact" ? 18 : 28;

  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={message ?? "Chargement"}>
      <View style={styles.row}>
        {dots.map((dot) => (
          <WaveDot
            key={`${dot.x}-${dot.color}`}
            color={dot.color}
            size={dot.size}
            travel={travel}
            durationMs={durationMs}
            delayMs={dot.delayMs}
          />
        ))}
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

export function FullScreenLoadingOverlay({
  visible,
  message
}: {
  visible: boolean;
  message?: string;
}): React.ReactElement | null {
  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <UniversalLoadingState message={message} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10
  },
  message: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 24
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(1, 10, 25, 0.35)",
    alignItems: "center",
    justifyContent: "center"
  }
});
