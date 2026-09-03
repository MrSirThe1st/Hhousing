import { beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createS256Challenge } from "./pkce";
import {
  consumeDesktopAuthCode,
  mintDesktopAuthCode,
  resetDesktopAuthStore,
  saveDesktopAuthPending,
  takeDesktopAuthPending
} from "./store";

describe("desktop auth store", () => {
  beforeEach(() => {
    process.env.HH_DESKTOP_AUTH_STORE_PATH = join(
      mkdtempSync(join(tmpdir(), "hh-desktop-auth-")),
      "store.json"
    );
    resetDesktopAuthStore();
  });

  it("stores and consumes a pending PKCE challenge once", () => {
    saveDesktopAuthPending({
      state: "state-one-two-three",
      challenge: "challenge-value-challenge-value-challenge-xx",
      intent: "login",
      redirectUri: "haraka-property://auth/callback",
      createdAt: Date.now()
    });

    const first = takeDesktopAuthPending("state-one-two-three");
    const second = takeDesktopAuthPending("state-one-two-three");

    expect(first?.challenge).toBe("challenge-value-challenge-value-challenge-xx");
    expect(second).toBeNull();
  });

  it("mints a one-time authorization code that cannot be reused", () => {
    const verifier = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const record = mintDesktopAuthCode({
      state: "state-one-two-three",
      challenge: createS256Challenge(verifier),
      accessToken: "access-token",
      refreshToken: "refresh-token"
    });

    const first = consumeDesktopAuthCode(record.code);
    const second = consumeDesktopAuthCode(record.code);

    expect(first?.accessToken).toBe("access-token");
    expect(first?.refreshToken).toBe("refresh-token");
    expect(second).toBeNull();
  });
});
