import { ErrorState } from "@/components/error-state";

type NetworkErrorProps = {
  onRetry: () => void;
};

/** @deprecated Prefer ErrorState — kept as a thin offline wrapper for existing call sites. */
export function NetworkError({ onRetry }: NetworkErrorProps): React.ReactElement {
  return <ErrorState onRetry={onRetry} offline />;
}
