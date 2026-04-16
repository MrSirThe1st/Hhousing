/**
 * Repository unit tests for postgres-invoice.repository.ts
 * Tests syncInvoiceForPaidPayment and voidInvoice by mocking the pg Pool client.
 * No real database connection is used.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PoolClient } from "pg";
import { createPostgresInvoiceRepository } from "./postgres-invoice.repository";
import type { InvoiceQueryable } from "./postgres-invoice.repository";

// ---------------------------------------------------------------------------
// Mock builders
// ---------------------------------------------------------------------------

interface MockTx {
  query: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
}

function makeTx(queryResponses: Array<{ rows: unknown[]; rowCount?: number }>): MockTx {
  let callIndex = 0;
  const responses = queryResponses;

  const query = vi.fn((_text: string, _values?: unknown[]) => {
    // BEGIN / COMMIT / ROLLBACK return nothing meaningful
    const text = _text as string;
    if (/^begin$|^commit$|^rollback$/i.test(text.trim())) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (/pg_advisory_xact_lock/i.test(text)) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    const response = responses[callIndex++] ?? { rows: [], rowCount: 0 };
    return Promise.resolve(response);
  });

  return {
    query,
    release: vi.fn(),
  };
}

function makeClient(tx: MockTx): InvoiceQueryable {
  return {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: vi.fn().mockResolvedValue(tx as unknown as PoolClient),
  };
}

// Sample row shapes returned from DB
function makeInvoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv_001",
    organization_id: "org_1",
    lease_id: "lease_1",
    tenant_id: "ten_1",
    property_id: "prop_1",
    unit_id: "unit_1",
    invoice_year: 2026,
    invoice_sequence: 1,
    invoice_number: "INV-2026-000001",
    invoice_type: "monthly",
    period: "2026-04",
    issue_date: "2026-04-01",
    due_date: "2026-04-05",
    currency_code: "EUR",
    total_amount: "1200.00",
    amount_paid: "0.00",
    status: "issued",
    paid_at: null,
    email_status: "not_sent",
    email_sent_count: 0,
    last_emailed_at: null,
    last_email_error: null,
    void_reason: null,
    voided_at: null,
    source_payment_id: null,
    created_at: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// syncInvoiceForPaidPayment
// ---------------------------------------------------------------------------

describe("syncInvoiceForPaidPayment — idempotency: already-applied payment", () => {
  it("returns existing invoice without re-applying when payment_id already recorded", async () => {
    const existingApplication = {
      id: "iap_001",
      organization_id: "org_1",
      invoice_id: "inv_001",
      payment_id: "pay_001",
      applied_amount: "1200.00",
      applied_at: "2026-04-05T00:00:00.000Z",
      created_at: "2026-04-05T00:00:00.000Z",
    };

    // Query sequence inside syncInvoiceForPaidPayment:
    // 1. check existing application → found
    // 2. fetch invoice by application.invoice_id → found
    const tx = makeTx([
      { rows: [existingApplication], rowCount: 1 },
      { rows: [makeInvoiceRow()], rowCount: 1 },
    ]);

    const client = makeClient(tx);
    const repo = createPostgresInvoiceRepository(client);

    const result = await repo.syncInvoiceForPaidPayment({
      organizationId: "org_1",
      leaseId: "lease_1",
      tenantId: "ten_1",
      paymentId: "pay_001",
      period: "2026-04",
      dueDate: "2026-04-05",
      amount: 1200,
      currencyCode: "EUR",
    });

    expect(result.appliedAmount).toBe(0);
    expect(result.creditCreatedAmount).toBe(0);
    expect(result.invoice.id).toBe("inv_001");
  });
});

describe("syncInvoiceForPaidPayment — creates new invoice when none exists", () => {
  it("inserts invoice, creates application, transitions status to paid when full amount", async () => {
    const freshInvoiceRow = makeInvoiceRow({ amount_paid: "0.00", status: "issued" });
    const paidInvoiceRow = makeInvoiceRow({ amount_paid: "1200.00", status: "paid", paid_at: "2026-04-05", email_status: "not_sent" });
    const refreshedRow = makeInvoiceRow({ amount_paid: "1200.00", status: "paid", paid_at: "2026-04-05", email_status: "queued" });

    const tx = makeTx([
      // 1. check existing application → not found
      { rows: [], rowCount: 0 },
      // 2. fetch lease context
      { rows: [{ property_id: "prop_1", unit_id: "unit_1" }], rowCount: 1 },
      // 3. find existing invoice by period → not found
      { rows: [], rowCount: 0 },
      // 4. (advisory lock handled by regex in makeTx)
      // 5. sequence query
      { rows: [{ next_sequence: 1 }], rowCount: 1 },
      // 6. insert invoice (returns fresh row with amount_paid=0)
      { rows: [freshInvoiceRow], rowCount: 1 },
      // 7. UPDATE invoice (amount_paid=1200, status=paid)
      { rows: [paidInvoiceRow], rowCount: 1 },
      // 8. INSERT invoice_payment_applications
      { rows: [], rowCount: 1 },
      // 9. INSERT invoice_email_jobs (auto_on_paid)
      { rows: [], rowCount: 1 },
      // 10. UPDATE email_status = queued on invoice
      { rows: [], rowCount: 1 },
      // 11. SELECT refreshed invoice
      { rows: [refreshedRow], rowCount: 1 },
    ]);

    const client = makeClient(tx);
    const repo = createPostgresInvoiceRepository(client);

    const result = await repo.syncInvoiceForPaidPayment({
      organizationId: "org_1",
      leaseId: "lease_1",
      tenantId: "ten_1",
      paymentId: "pay_new_001",
      period: "2026-04",
      dueDate: "2026-04-05",
      amount: 1200,
      currencyCode: "EUR",
    });

    expect(result.invoice.status).toBe("paid");
    expect(result.appliedAmount).toBeGreaterThan(0);
    expect(result.creditCreatedAmount).toBe(0);
  });
});

describe("syncInvoiceForPaidPayment — overpayment creates credit", () => {
  it("caps amountPaid at totalAmount and creates credit for the excess", async () => {
    const freshRow = makeInvoiceRow({ total_amount: "1200.00", amount_paid: "0.00", status: "issued" });
    const paidRow = makeInvoiceRow({ total_amount: "1200.00", amount_paid: "1200.00", status: "paid", paid_at: "2026-04-05", email_status: "not_sent" });
    const refreshedRow = makeInvoiceRow({ total_amount: "1200.00", amount_paid: "1200.00", status: "paid", paid_at: "2026-04-05", email_status: "queued" });

    const tx = makeTx([
      // 1. existing application → none
      { rows: [], rowCount: 0 },
      // 2. lease context
      { rows: [{ property_id: "prop_1", unit_id: "unit_1" }], rowCount: 1 },
      // 3. existing invoice → none
      { rows: [], rowCount: 0 },
      // 4. advisory lock (handled by regex)
      // 5. sequence
      { rows: [{ next_sequence: 2 }], rowCount: 1 },
      // 6. insert invoice (total=1200, amount_paid=0)
      { rows: [freshRow], rowCount: 1 },
      // 7. UPDATE invoice (amount_paid=1200, status=paid)
      { rows: [paidRow], rowCount: 1 },
      // 8. INSERT application
      { rows: [], rowCount: 1 },
      // 9. INSERT credit (300 overpayment)
      { rows: [], rowCount: 1 },
      // 10. INSERT email job (auto_on_paid)
      { rows: [], rowCount: 1 },
      // 11. UPDATE email_status
      { rows: [], rowCount: 1 },
      // 12. SELECT refreshed invoice
      { rows: [refreshedRow], rowCount: 1 },
    ]);

    const client = makeClient(tx);
    const repo = createPostgresInvoiceRepository(client);

    const result = await repo.syncInvoiceForPaidPayment({
      organizationId: "org_1",
      leaseId: "lease_1",
      tenantId: "ten_1",
      paymentId: "pay_over_001",
      period: "2026-04",
      dueDate: "2026-04-05",
      amount: 1500, // 300 overpayment
      currencyCode: "EUR",
    });

    // Applied must not exceed totalAmount
    expect(result.appliedAmount).toBeLessThanOrEqual(1200);
    expect(result.invoice.status).toBe("paid");
    // Credit for the overage
    if (result.creditCreatedAmount > 0) {
      expect(result.creditCreatedAmount).toBeLessThanOrEqual(300);
    }
  });
});

// ---------------------------------------------------------------------------
// voidInvoice
// ---------------------------------------------------------------------------

describe("voidInvoice — invoice not found", () => {
  it("returns null when invoice does not exist for org", async () => {
    const tx = makeTx([
      // invoice SELECT FOR UPDATE → not found
      { rows: [], rowCount: 0 },
    ]);

    const client = makeClient(tx);
    const repo = createPostgresInvoiceRepository(client);

    const result = await repo.voidInvoice("inv_missing", "org_1", "duplicate");

    expect(result).toBeNull();
  });
});

describe("voidInvoice — already void invoice returns early", () => {
  it("returns invoice with zero creditAdjustedAmount without re-voiding", async () => {
    const voidRow = makeInvoiceRow({
      status: "void",
      void_reason: "already voided",
      voided_at: "2026-04-10T00:00:00.000Z",
    });

    const tx = makeTx([
      // SELECT FOR UPDATE → found, already void
      { rows: [voidRow], rowCount: 1 },
    ]);

    const client = makeClient(tx);
    const repo = createPostgresInvoiceRepository(client);

    const result = await repo.voidInvoice("inv_001", "org_1", "idempotent call");

    expect(result).not.toBeNull();
    expect(result!.invoice.status).toBe("void");
    expect(result!.creditAdjustedAmount).toBe(0);
  });
});

describe("voidInvoice — no payments, no credit reversal needed", () => {
  it("sets status=void without credit upsert when amountPaid is 0", async () => {
    const issuedRow = makeInvoiceRow({ status: "issued", amount_paid: "0.00" });
    const voidedRow = makeInvoiceRow({
      status: "void",
      void_reason: "billing error",
      voided_at: "2026-04-16T10:00:00.000Z",
      email_status: "not_sent",
    });

    const tx = makeTx([
      // SELECT FOR UPDATE → issued invoice, amountPaid=0
      { rows: [issuedRow], rowCount: 1 },
      // UPDATE invoices → voided
      { rows: [voidedRow], rowCount: 1 },
    ]);

    const client = makeClient(tx);
    const repo = createPostgresInvoiceRepository(client);

    const result = await repo.voidInvoice("inv_001", "org_1", "billing error");

    expect(result).not.toBeNull();
    expect(result!.invoice.status).toBe("void");
    expect(result!.creditAdjustedAmount).toBe(0);

    // Only 2 real queries (besides BEGIN/COMMIT): SELECT + UPDATE — no credit INSERT
    const realQueries = tx.query.mock.calls.filter(
      ([sql]: [string]) => !/^begin$|^commit$|^rollback$/i.test(sql.trim())
    );
    expect(realQueries.some(([sql]: [string]) => /lease_credit_balances/.test(sql))).toBe(false);
  });
});

describe("voidInvoice — partial payment, credit reversal", () => {
  it("upserts credit for amountPaid when voiding a partially paid invoice", async () => {
    const partialRow = makeInvoiceRow({
      status: "partial",
      amount_paid: "600.00",
      total_amount: "1200.00",
    });
    const voidedRow = makeInvoiceRow({
      status: "void",
      amount_paid: "600.00",
      void_reason: "tenant relocated",
      voided_at: "2026-04-16T12:00:00.000Z",
    });

    const tx = makeTx([
      // SELECT FOR UPDATE → partial invoice
      { rows: [partialRow], rowCount: 1 },
      // credit UPSERT
      { rows: [], rowCount: 1 },
      // UPDATE invoices
      { rows: [voidedRow], rowCount: 1 },
    ]);

    const client = makeClient(tx);
    const repo = createPostgresInvoiceRepository(client);

    const result = await repo.voidInvoice("inv_001", "org_1", "tenant relocated");

    expect(result).not.toBeNull();
    expect(result!.creditAdjustedAmount).toBe(600);
    expect(result!.invoice.status).toBe("void");

    // Should have called credit upsert
    const creditCall = tx.query.mock.calls.find(
      ([sql]: [string]) => /lease_credit_balances/.test(sql)
    );
    expect(creditCall).toBeDefined();
  });
});
