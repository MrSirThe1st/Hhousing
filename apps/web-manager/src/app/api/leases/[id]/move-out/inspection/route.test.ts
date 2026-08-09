import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: vi.fn()
}));

import { PATCH } from "./route";

describe("/api/leases/[id]/move-out/inspection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns FEATURE_DISABLED for the legacy inspection path", async () => {
    const response = await PATCH();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      success: false,
      code: "FEATURE_DISABLED"
    });
  });
});
