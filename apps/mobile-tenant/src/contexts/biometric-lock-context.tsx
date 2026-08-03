import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { PropsWithChildren } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useAuth } from "@/contexts/auth-context";
import { usePreferences } from "@/contexts/preferences-context";
import {
  authenticateWithBiometrics,
  biometricFailureMessage,
  verifyStoredPassword,
  type BiometricAuthResult
} from "@/lib/biometrics";
import i18n from "@/i18n";

/** Relock only after the app was backgrounded longer than this (ms). */
const BACKGROUND_RELOCK_MS = 5_000;

type BiometricLockContextValue = {
  isLocked: boolean;
  isAuthenticating: boolean;
  lastError: string | null;
  unlock: () => Promise<boolean>;
  unlockWithPassword: (password: string) => Promise<string | null>;
  clearLastError: () => void;
};

const BiometricLockContext = createContext<BiometricLockContextValue | null>(null);

export function BiometricLockProvider({ children }: PropsWithChildren): React.ReactElement {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { biometricEnabled, isReady: prefsReady } = usePreferences();
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const backgroundedAtRef = useRef<number | null>(null);
  const promptedForSessionRef = useRef(false);
  /** True once this session was usable without a biometric gate (e.g. just logged in). */
  const hadUnlockedSessionRef = useRef(false);

  const shouldLock = Boolean(session && biometricEnabled && prefsReady && !isAuthLoading);

  useEffect(() => {
    if (!session) {
      hadUnlockedSessionRef.current = false;
      return;
    }
    if (!isAuthLoading && prefsReady && !biometricEnabled) {
      // User is in the app without biometrics required — enabling later must not lock immediately.
      hadUnlockedSessionRef.current = true;
    }
  }, [session, isAuthLoading, prefsReady, biometricEnabled]);

  useEffect(() => {
    if (!shouldLock) {
      setIsLocked(false);
      setLastError(null);
      promptedForSessionRef.current = false;
      return;
    }

    // Cold start with biometrics already on: lock until verified.
    // Mid-session enable (post-login / Settings): stay unlocked until next background.
    if (!promptedForSessionRef.current) {
      promptedForSessionRef.current = true;
      setIsLocked(!hadUnlockedSessionRef.current);
    }
  }, [shouldLock]);

  useEffect(() => {
    if (!shouldLock) {
      return;
    }

    function onAppStateChange(next: AppStateStatus): void {
      // Ignore `inactive` — Face ID / system sheets also move the app there.
      if (next === "background") {
        if (backgroundedAtRef.current === null) {
          backgroundedAtRef.current = Date.now();
        }
        return;
      }

      if (next === "active") {
        const backgroundedAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (backgroundedAt !== null && Date.now() - backgroundedAt >= BACKGROUND_RELOCK_MS) {
          setIsLocked(true);
          setLastError(null);
        }
      }
    }

    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [shouldLock]);

  const unlock = useCallback(async (): Promise<boolean> => {
    if (isAuthenticating) {
      return false;
    }

    setIsAuthenticating(true);
    setLastError(null);
    try {
      const result: BiometricAuthResult = await authenticateWithBiometrics(
        i18n.t("biometric.unlockPrompt")
      );
      if (result.success) {
        setIsLocked(false);
        return true;
      }

      const message = biometricFailureMessage(result);
      if (message) {
        setLastError(message);
      }
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating]);

  const unlockWithPassword = useCallback(async (password: string): Promise<string | null> => {
    if (password.length < 8) {
      return i18n.t("auth.passwordTooShort");
    }

    setIsAuthenticating(true);
    setLastError(null);
    try {
      const ok = await verifyStoredPassword(password);
      if (!ok) {
        const message = i18n.t("biometric.wrongPassword");
        setLastError(message);
        return message;
      }
      setIsLocked(false);
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const clearLastError = useCallback((): void => {
    setLastError(null);
  }, []);

  const autoPromptedRef = useRef(false);

  useEffect(() => {
    if (!isLocked || !shouldLock) {
      autoPromptedRef.current = false;
      return;
    }

    if (autoPromptedRef.current || isAuthenticating) {
      return;
    }

    autoPromptedRef.current = true;
    void unlock();
  }, [isLocked, shouldLock, isAuthenticating, unlock]);

  const value = useMemo(
    () => ({
      isLocked: shouldLock && isLocked,
      isAuthenticating,
      lastError,
      unlock,
      unlockWithPassword,
      clearLastError
    }),
    [shouldLock, isLocked, isAuthenticating, lastError, unlock, unlockWithPassword, clearLastError]
  );

  return (
    <BiometricLockContext.Provider value={value}>
      {children}
    </BiometricLockContext.Provider>
  );
}

export function useBiometricLock(): BiometricLockContextValue {
  const value = useContext(BiometricLockContext);
  if (!value) {
    throw new Error("useBiometricLock must be used within BiometricLockProvider");
  }
  return value;
}
