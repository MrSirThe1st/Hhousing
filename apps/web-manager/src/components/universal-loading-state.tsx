import type { ReactElement } from "react";
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

type UniversalLoadingStateProps = {
  minHeightClassName?: string;
  className?: string;
  size?: "default" | "compact";
};

const animationData = animationDataSource as unknown as MaterialWaveAnimationData;

function getRgbColorString(color: [number, number, number, number]): string {
  const [red, green, blue] = color;

  return `rgb(${Math.round(red * 255)} ${Math.round(green * 255)} ${Math.round(blue * 255)})`;
}

function getLoaderDots(): Array<{ color: string; delaySeconds: number; size: number; x: number }> {
  return animationData.layers
    .map((layer) => {
      const keyframes = layer.ks.p.k;
      const firstFrame = keyframes[0];
      const colorToken = layer.shapes[0]?.it.find((item) => item.c)?.c;
      const ellipseSize = layer.shapes[0]?.it.find((item) => item.s)?.s;

      return {
        color: getRgbColorString(colorToken?.k ?? [0.1176471, 0.5333334, 0.8980392, 1]),
        delaySeconds: (firstFrame?.t ?? 0) / animationData.fr,
        size: Math.round((ellipseSize?.k[0] ?? 33.75) * 0.75),
        x: firstFrame?.s?.[0] ?? 0
      };
    })
    .sort((left, right) => left.x - right.x);
}

export default function UniversalLoadingState({
  minHeightClassName = "min-h-[50vh]",
  className = "",
  size = "default"
}: UniversalLoadingStateProps): ReactElement {
  const dots = getLoaderDots();
  const animationDurationSeconds = animationData.op / animationData.fr;
  const travelDistance = size === "compact" ? 18 : 28;
  const gapClassName = size === "compact" ? "gap-2" : "gap-2.5";

  return (
    <div className={`flex items-center justify-center ${minHeightClassName} ${className}`.trim()} role="status" aria-live="polite">
      <div className={`flex items-end ${gapClassName}`}>
        {dots.map((dot) => (
          <span
            key={`${dot.x}-${dot.color}`}
            className="hhousing-universal-loader-dot block rounded-full"
            style={{
              width: `${size === "compact" ? Math.max(12, Math.round(dot.size * 0.62)) : dot.size}px`,
              height: `${size === "compact" ? Math.max(12, Math.round(dot.size * 0.62)) : dot.size}px`,
              backgroundColor: dot.color,
              animationDuration: `${animationDurationSeconds}s`,
              animationDelay: `${-dot.delaySeconds}s`,
              ["--hhousing-loader-travel" as string]: `-${travelDistance}px`
            }}
          />
        ))}
      </div>
      <span className="sr-only">Chargement</span>

      <style jsx>{`
        .hhousing-universal-loader-dot {
          animation-name: hhousing-material-wave;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
          transform: translate3d(0, 0, 0);
          will-change: transform;
        }

        @keyframes hhousing-material-wave {
          0%,
          50%,
          100% {
            transform: translate3d(0, 0, 0);
          }

          25% {
            transform: translate3d(0, var(--hhousing-loader-travel), 0);
          }
        }
      `}</style>
    </div>
  );
}