import type { StoredCredentials } from "@/lib/biometrics";

/**
 * Holds the password just used at login so post-login Face ID setup can
 * store credentials without asking again. Memory-only — cleared after use.
 */
let pending: StoredCredentials | null = null;

export function setPendingBiometricCredentials(credentials: StoredCredentials): void {
  pending = credentials;
}

export function takePendingBiometricCredentials(): StoredCredentials | null {
  const next = pending;
  pending = null;
  return next;
}

export function peekPendingBiometricCredentials(): StoredCredentials | null {
  return pending;
}

export function clearPendingBiometricCredentials(): void {
  pending = null;
}
