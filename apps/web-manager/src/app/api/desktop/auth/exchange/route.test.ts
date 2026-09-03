import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("/api/desktop/auth/exchange", () => {
  it("rejects invalid JSON", async () => {
    const response = await POST(
      new Request("http://127.0.0.1/api/desktop/auth/exchange", {
        method: "POST",
        body: "not-json"
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_request" });
  });

  it("rejects a missing PKCE verifier", async () => {
    const response = await POST(
      new Request("http://127.0.0.1/api/desktop/auth/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "abc", state: "state-one-two-three" })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_request" });
  });
});
