import { describe, expect, it } from "vitest";

function unwrapDepositStatus(payload: {
  status?: string;
  depositId?: string;
  data?: { status?: string; depositId?: string };
}): { depositId: string; status: string } {
  if (payload.data?.status && payload.data.depositId) {
    return { depositId: payload.data.depositId, status: payload.data.status };
  }
  if (payload.status && payload.depositId) {
    return { depositId: payload.depositId, status: payload.status };
  }
  throw new Error("missing");
}

describe("unwrapDepositStatus", () => {
  it("reads nested COMPLETED from FOUND envelope", () => {
    expect(
      unwrapDepositStatus({
        status: "FOUND",
        data: {
          depositId: "abc",
          status: "COMPLETED"
        }
      })
    ).toEqual({ depositId: "abc", status: "COMPLETED" });
  });
});
