import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

type AmountPrivacyContextValue = {
  amountsRevealed: boolean;
  toggleAmountsRevealed: () => void;
  setAmountsRevealed: (revealed: boolean) => void;
};

const AmountPrivacyContext = createContext<AmountPrivacyContextValue | null>(null);

export function AmountPrivacyProvider({ children }: PropsWithChildren): React.ReactElement {
  const [amountsRevealed, setAmountsRevealed] = useState(false);

  const toggleAmountsRevealed = useCallback(() => {
    setAmountsRevealed((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({ amountsRevealed, toggleAmountsRevealed, setAmountsRevealed }),
    [amountsRevealed, toggleAmountsRevealed]
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
