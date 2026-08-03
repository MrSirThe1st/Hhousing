import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { PropsWithChildren } from "react";
import { usePreferences } from "@/contexts/preferences-context";

type AmountPrivacyContextValue = {
  /** True when amounts are shown in clear (either sensitive mode off, or user revealed). */
  amountsRevealed: boolean;
  /** Preference: start masked + allow eye toggle. */
  amountsSensitive: boolean;
  toggleAmountsRevealed: () => void;
  setAmountsRevealed: (revealed: boolean) => void;
};

const AmountPrivacyContext = createContext<AmountPrivacyContextValue | null>(null);

export function AmountPrivacyProvider({ children }: PropsWithChildren): React.ReactElement {
  const { amountsSensitive } = usePreferences();
  const [sessionRevealed, setSessionRevealed] = useState(false);

  // Leaving sensitive mode → always show amounts. Re-enabling → mask again.
  useEffect(() => {
    if (!amountsSensitive) {
      setSessionRevealed(true);
      return;
    }
    setSessionRevealed(false);
  }, [amountsSensitive]);

  const amountsRevealed = !amountsSensitive || sessionRevealed;

  const toggleAmountsRevealed = useCallback(() => {
    if (!amountsSensitive) {
      return;
    }
    setSessionRevealed((prev) => !prev);
  }, [amountsSensitive]);

  const setAmountsRevealed = useCallback(
    (revealed: boolean) => {
      if (!amountsSensitive) {
        return;
      }
      setSessionRevealed(revealed);
    },
    [amountsSensitive]
  );

  const value = useMemo(
    () => ({
      amountsRevealed,
      amountsSensitive,
      toggleAmountsRevealed,
      setAmountsRevealed
    }),
    [amountsRevealed, amountsSensitive, toggleAmountsRevealed, setAmountsRevealed]
  );

  return (
    <AmountPrivacyContext.Provider value={value}>
      {children}
    </AmountPrivacyContext.Provider>
  );
}

export function useAmountPrivacy(): AmountPrivacyContextValue {
  const value = useContext(AmountPrivacyContext);
  if (!value) {
    throw new Error("useAmountPrivacy must be used within AmountPrivacyProvider");
  }
  return value;
}
