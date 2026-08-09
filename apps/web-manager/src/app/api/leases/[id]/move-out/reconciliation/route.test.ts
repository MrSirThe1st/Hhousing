import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("/api/leases/[id]/move-out/reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns FEATURE_DISABLED for the legacy reconciliation path", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      success: false,
      code: "FEATURE_DISABLED"
    });
  });
});
