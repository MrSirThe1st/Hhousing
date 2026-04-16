import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Invoice, InvoiceEmailJob } from "@hhousing/domain";
import type { InvoiceRepository } from "@hhousing/data-access";
import type { TeamPermissionRepository } from "../organizations/permissions";
import { getInvoiceDetail, queueInvoiceEmail, voidInvoice } from "./invoice";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv_test001",
    organizationId: "org_1",
    leaseId: "lease_1",
    tenantId: "ten_1",
    propertyId: "prop_1",
    unitId: "unit_1",
    invoiceYear: 2026,
    invoiceSequence: 1,
    invoiceNumber: "INV-2026-000001",
    invoiceType: "monthly",
    period: "2026-04",
    issueDate: "2026-04-01",
    dueDate: "2026-04-05",
    currencyCode: "EUR",
    totalAmount: 1200,
    amountPaid: 0,
    status: "issued",
    paidAt: null,
    emailStatus: "not_sent",
    emailSentCount: 0,
    lastEmailedAtIso: null,
    lastEmailError: null,
    voidReason: null,
    voidedAtIso: null,
    sourcePaymentId: null,
    createdAtIso: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSession() {
  return {
    userId: "user_1",
    role: "landlord" as const,
    organizationId: "org_1",
    capabilities: {
      canOwnProperties: true,
    },
    memberships: [],
  };
}

function makeTeamFunctionsRepo(): TeamPermissionRepository {
  return {
    listMemberFunctions: vi.fn().mockResolvedValue([]),
  };
}

function makeRepo(overrides: Partial<InvoiceRepository> = {}): InvoiceRepository {
  return {
    listInvoices: vi.fn().mockResolvedValue([]),
    listLeaseCreditBalances: vi.fn().mockResolvedValue([]),
    getInvoiceById: vi.fn().mockResolvedValue(null),
    getInvoiceDetail: vi.fn().mockResolvedValue(null),
    voidInvoice: vi.fn().mockResolvedValue(null),
    queueInvoiceEmailJob: vi.fn().mockResolvedValue(true),
    syncInvoiceForPaidPayment: vi.fn(),
    claimProcessableEmailJobs: vi.fn().mockResolvedValue([]),
    markEmailJobSent: vi.fn().mockResolvedValue(undefined),
    markEmailJobFailed: vi.fn().mockResolvedValue(undefined),
    releaseProcessingEmailJob: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as InvoiceRepository;
}

// ---------------------------------------------------------------------------
// getInvoiceDetail
// ---------------------------------------------------------------------------

describe("getInvoiceDetail", () => {
  it("returns 401 when session is null", async () => {
    const result = await getInvoiceDetail(
      { invoiceId: "inv_test001", session: null },
      { repository: makeRepo(), teamFunctionsRepository: makeTeamFunctionsRepo() }
    );
    expect(result.status).toBe(401);
    expect(result.body.success).toBe(false);
  });

  it("returns 404 when invoice not found", async () => {
    const repo = makeRepo({ getInvoiceDetail: vi.fn().mockResolvedValue(null) });
    const result = await getInvoiceDetail(
      { invoiceId: "inv_missing", session: makeSession() },
      { repository: repo, teamFunctionsRepository: makeTeamFunctionsRepo() }
    );
    expect(result.status).toBe(404);
    expect(result.body.success).toBe(false);
  });

  it("returns 200 with invoice detail when found", async () => {
    const invoice = makeInvoice();
    const repo = makeRepo({
      getInvoiceDetail: vi.fn().mockResolvedValue({
        invoice,
        applications: [],
        creditBalance: null,
        emailJobs: [],
      }),
    });

    const result = await getInvoiceDetail(
      { invoiceId: "inv_test001", session: makeSession() },
      { repository: repo, teamFunctionsRepository: makeTeamFunctionsRepo() }
    );

    expect(result.status).toBe(200);
    if (!result.body.success) throw new Error("Expected success");
    expect(result.body.data.invoice.id).toBe("inv_test001");
    expect(result.body.data.applications).toEqual([]);
    expect(result.body.data.emailJobs).toEqual([]);
  });

  it("returns creditBalance when present", async () => {
    const invoice = makeInvoice();
    const creditBalance = {
      id: "crd_1",
      organizationId: "org_1",
      leaseId: "lease_1",
      currencyCode: "EUR",
      creditAmount: 50,
      updatedAtIso: "2026-04-01T00:00:00.000Z",
    };
    const repo = makeRepo({
      getInvoiceDetail: vi.fn().mockResolvedValue({
        invoice,
        applications: [],
        creditBalance,
        emailJobs: [],
      }),
    });

    const result = await getInvoiceDetail(
      { invoiceId: "inv_test001", session: makeSession() },
      { repository: repo, teamFunctionsRepository: makeTeamFunctionsRepo() }
    );

    expect(result.status).toBe(200);
    if (!result.body.success) throw new Error("Expected success");
    expect(result.body.data.creditBalance?.creditAmount).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// queueInvoiceEmail — send / resend dispatch
// ---------------------------------------------------------------------------

describe("queueInvoiceEmail", () => {
  it("returns 401 when session is null", async () => {
    const result = await queueInvoiceEmail(
      { invoiceId: "inv_test001", body: { action: "send" }, session: null },
      { repository: makeRepo(), createId: () => "iej_1", teamFunctionsRepository: makeTeamFunctionsRepo() }
    );
    expect(result.status).toBe(401);
  });

  it("returns 400 when body action is invalid", async () => {
    const result = await queueInvoiceEmail(
      { invoiceId: "inv_test001", body: { action: "void" }, session: makeSession() },
      { repository: makeRepo(), createId: () => "iej_1", teamFunctionsRepository: makeTeamFunctionsRepo() }
    );
    expect(result.status).toBe(400);
    expect(result.body.success).toBe(false);
  });

  it("returns 404 when invoice not found", async () => {
    const repo = makeRepo({ getInvoiceById: vi.fn().mockResolvedValue(null) });
    const result = await queueInvoiceEmail(
      { invoiceId: "inv_missing", body: { action: "send" }, session: makeSession() },
      { repository: repo, createId: () => "iej_1", teamFunctionsRepository: makeTeamFunctionsRepo() }
    );
    expect(result.status).toBe(404);
  });

  it("returns 400 when invoice is void", async () => {
    const voidInv = makeInvoice({ status: "void" });
    const refreshed = makeInvoice({ emailStatus: "queued" });
    const repo = makeRepo({
      getInvoiceById: vi.fn()
        .mockResolvedValueOnce(voidInv),
    });
    const result = await queueInvoiceEmail(
      { invoiceId: "inv_test001", body: { action: "send" }, session: makeSession() },
      { repository: repo, createId: () => "iej_1", teamFunctionsRepository: makeTeamFunctionsRepo() }
    );
    expect(result.status).toBe(400);
    if (!result.body.success === false) throw new Error("Expected failure");
    expect(result.body.success).toBe(false);
  });

  it("returns 200 and queues job for send action", async () => {
    const inv = makeInvoice();
    const refreshed = makeInvoice({ emailStatus: "queued" });
    const repo = makeRepo({
      getInvoiceById: vi.fn()
        .mockResolvedValueOnce(inv)
        .mockResolvedValueOnce(refreshed),
      queueInvoiceEmailJob: vi.fn().mockResolvedValue(true),
    });

    const result = await queueInvoiceEmail(
      { invoiceId: "inv_test001", body: { action: "send" }, session: makeSession() },
      { repository: repo, createId: () => "iej_1", teamFunctionsRepository: makeTeamFunctionsRepo() }
    );

    expect(result.status).toBe(200);
    if (!result.body.success) throw new Error("Expected success");
    expect(result.body.data.invoice.emailStatus).toBe("queued");
    expect(repo.queueInvoiceEmailJob).toHaveBeenCalledWith(
      expect.objectContaining({ id: "iej_1", reason: "send" })
    );
  });

  it("returns 200 and queues job for resend action", async () => {
    const inv = makeInvoice({ emailStatus: "sent", emailSentCount: 1 });
    const refreshed = makeInvoice({ emailStatus: "queued", emailSentCount: 1 });
    const repo = makeRepo({
      getInvoiceById: vi.fn()
        .mockResolvedValueOnce(inv)
        .mockResolvedValueOnce(refreshed),
      queueInvoiceEmailJob: vi.fn().mockResolvedValue(true),
    });

    const result = await queueInvoiceEmail(
      { invoiceId: "inv_test001", body: { action: "resend" }, session: makeSession() },
      { repository: repo, createId: () => "iej_2", teamFunctionsRepository: makeTeamFunctionsRepo() }
    );

    expect(result.status).toBe(200);
    expect(repo.queueInvoiceEmailJob).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "resend" })
    );
  });
});

// ---------------------------------------------------------------------------
// voidInvoice
// ---------------------------------------------------------------------------

describe("voidInvoice", () => {
  it("returns 401 when session is null", async () => {
    const result = await voidInvoice(
      { invoiceId: "inv_test001", body: { action: "void", reason: "duplicate" }, session: null },
      { repository: makeRepo(), teamFunctionsRepository: makeTeamFunctionsRepo() }
    );
    expect(result.status).toBe(401);
  });

  it("returns 400 when action is wrong", async () => {
    const result = await voidInvoice(
      { invoiceId: "inv_test001", body: { action: "send", reason: "oops" }, session: makeSession() },
      { repository: makeRepo(), teamFunctionsRepository: makeTeamFunctionsRepo() }
    );
    expect(result.status).toBe(400);
  });

  it("returns 400 when reason is too short", async () => {
    const result = await voidInvoice(
      { invoiceId: "inv_test001", body: { action: "void", reason: "ab" }, session: makeSession() },
      { repository: makeRepo(), teamFunctionsRepository: makeTeamFunctionsRepo() }
    );
    expect(result.status).toBe(400);
  });

  it("returns 400 when reason is missing", async () => {
    const result = await voidInvoice(
      { invoiceId: "inv_test001", body: { action: "void" }, session: makeSession() },
      { repository: makeRepo(), teamFunctionsRepository: makeTeamFunctionsRepo() }
    );
    expect(result.status).toBe(400);
  });

  it("returns 404 when invoice not found", async () => {
    const repo = makeRepo({ voidInvoice: vi.fn().mockResolvedValue(null) });
    const result = await voidInvoice(
      { invoiceId: "inv_missing", body: { action: "void", reason: "duplicate entry" }, session: makeSession() },
      { repository: repo, teamFunctionsRepository: makeTeamFunctionsRepo() }
    );
    expect(result.status).toBe(404);
  });

  it("returns 200 with voided invoice and zero credit when no payments applied", async () => {
    const voided = makeInvoice({ status: "void", voidReason: "duplicate entry", voidedAtIso: "2026-04-16T10:00:00.000Z" });
    const repo = makeRepo({
      voidInvoice: vi.fn().mockResolvedValue({ invoice: voided, creditAdjustedAmount: 0 }),
    });

    const result = await voidInvoice(
      { invoiceId: "inv_test001", body: { action: "void", reason: "duplicate entry" }, session: makeSession() },
      { repository: repo, teamFunctionsRepository: makeTeamFunctionsRepo() }
    );

    expect(result.status).toBe(200);
    if (!result.body.success) throw new Error("Expected success");
    expect(result.body.data.invoice.status).toBe("void");
    expect(result.body.data.creditAdjustedAmount).toBe(0);
    expect(repo.voidInvoice).toHaveBeenCalledWith(
      "inv_test001",
      "org_1",
      "duplicate entry"
    );
  });

  it("returns 200 with credit amount when payments were applied", async () => {
    const voided = makeInvoice({
      status: "void",
      amountPaid: 600,
      voidReason: "billing error",
      voidedAtIso: "2026-04-16T10:00:00.000Z",
    });
    const repo = makeRepo({
      voidInvoice: vi.fn().mockResolvedValue({ invoice: voided, creditAdjustedAmount: 600 }),
    });

    const result = await voidInvoice(
      { invoiceId: "inv_test001", body: { action: "void", reason: "billing error" }, session: makeSession() },
      { repository: repo, teamFunctionsRepository: makeTeamFunctionsRepo() }
    );

    expect(result.status).toBe(200);
    if (!result.body.success) throw new Error("Expected success");
    expect(result.body.data.creditAdjustedAmount).toBe(600);
  });

  it("passes organizationId from session to repository", async () => {
    const voided = makeInvoice({ status: "void" });
    const repo = makeRepo({
      voidInvoice: vi.fn().mockResolvedValue({ invoice: voided, creditAdjustedAmount: 0 }),
    });

    await voidInvoice(
      { invoiceId: "inv_test001", body: { action: "void", reason: "test reason" }, session: makeSession() },
      { repository: repo, teamFunctionsRepository: makeTeamFunctionsRepo() }
    );

    expect(repo.voidInvoice).toHaveBeenCalledWith("inv_test001", "org_1", "test reason");
  });
});
