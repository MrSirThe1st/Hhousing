import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Invoice, Organization } from "@hhousing/domain";

export interface InvoiceDocumentContext {
  invoice: Invoice;
  tenantName: string;
  tenantEmail?: string | null;
  organization?: Organization | null;
  issueDateLabel: string;
  dueDateLabel: string;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(value: number, currencyCode: string): string {
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ${currencyCode}`;
}

export function buildInvoiceDocumentContext(input: {
  invoice: Invoice;
  lease?: LeaseWithTenantView;
  tenantName?: string;
  tenantEmail?: string | null;
  organization?: Organization | null;
  formatDate: (value: string) => string;
}): InvoiceDocumentContext {
  return {
    invoice: input.invoice,
    tenantName: input.lease?.tenantFullName ?? input.tenantName ?? "Locataire",
    tenantEmail: input.lease?.tenantEmail ?? input.tenantEmail ?? null,
    organization: input.organization ?? null,
    issueDateLabel: input.formatDate(input.invoice.issueDate),
    dueDateLabel: input.formatDate(input.invoice.dueDate)
  };
}

export function buildInvoiceDocumentHtml(context: InvoiceDocumentContext): string {
  const { invoice, organization } = context;
  const companyName = organization?.name ?? "Votre organisation";
  const remaining = Math.max(0, invoice.totalAmount - invoice.amountPaid);

  const logoBlock = organization?.logoUrl
    ? `<img src="${escapeHtml(organization.logoUrl)}" alt="${escapeHtml(companyName)}" style="max-height:62px;max-width:220px;object-fit:contain;display:block;" />`
    : `<div style="font-size:26px;font-weight:700;letter-spacing:0.02em;color:#2b36f5;">${escapeHtml(companyName)}</div>`;

  const periodLabel = invoice.period ? escapeHtml(invoice.period) : "Facture ponctuelle";

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Facture ${escapeHtml(invoice.invoiceNumber)}</title>
    <style>
      :root {
        --ink: #111827;
        --muted: #6b7280;
        --line: #d1d5db;
        --brand: #2b36f5;
        --tableHead: #2b2f38;
        --paper: #ffffff;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #f3f4f6;
        color: var(--ink);
        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        padding: 28px;
      }
      .sheet {
        max-width: 980px;
        margin: 0 auto;
        background: var(--paper);
        border: 1px solid var(--line);
        padding: 34px;
      }
      .top-title {
        font-size: 28px;
        font-weight: 600;
        margin: 0 0 26px;
      }
      .identity {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: start;
        gap: 24px;
        margin-bottom: 16px;
      }
      .identity-right {
        text-align: right;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 28px;
        margin: 14px 0 24px;
      }
      .summary-strip {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin: 8px 0 14px;
        border: 1px solid var(--line);
      }
      .summary-cell {
        padding: 10px 12px;
      }
      .summary-cell--violet {
        background: #5f5ff6;
        color: #ffffff;
      }
      .summary-cell--dark {
        background: #2b2f38;
        color: #ffffff;
      }
      .summary-label {
        margin: 0 0 4px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: rgba(255, 255, 255, 0.78);
      }
      .summary-value {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
      }
      .small {
        margin: 0;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.5;
      }
      .bill-title {
        margin: 0 0 4px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #374151;
      }
      .bill-name {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
      }
      .invoice-facts {
        display: grid;
        gap: 4px;
        justify-items: end;
      }
      .fact {
        display: grid;
        grid-template-columns: auto auto;
        gap: 14px;
        align-items: baseline;
        font-size: 12px;
      }
      .fact-label { color: var(--muted); }
      .fact-value { font-weight: 600; }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 6px;
      }
      thead tr { background: var(--tableHead); }
      th {
        color: #fff;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        text-align: left;
        padding: 10px 12px;
      }
      th:last-child, td:last-child { text-align: right; }
      td {
        border-bottom: 1px solid var(--line);
        padding: 12px;
        font-size: 13px;
      }
      .total-row td {
        font-weight: 700;
        border-bottom-width: 0;
        padding-top: 16px;
      }
      .footer {
        margin-top: 42px;
        border-top: 1px solid var(--line);
        padding-top: 12px;
      }
      @media (max-width: 720px) {
        .summary-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media print {
        body { background: #fff; padding: 0; }
        .sheet { border: 0; max-width: none; padding: 14mm; }
      }
    </style>
  </head>
  <body>
    <article class="sheet">
      <h1 class="top-title">Invoice</h1>

      <section class="identity">
        <div>
          <p class="small">${escapeHtml(companyName)}</p>
          ${organization?.address ? `<p class="small">${escapeHtml(organization.address)}</p>` : ""}
          ${organization?.contactEmail ? `<p class="small">${escapeHtml(organization.contactEmail)}</p>` : ""}
          ${organization?.contactPhone ? `<p class="small">${escapeHtml(organization.contactPhone)}</p>` : ""}
          ${organization?.websiteUrl ? `<p class="small">${escapeHtml(organization.websiteUrl)}</p>` : ""}
        </div>
        <div class="identity-right">${logoBlock}</div>
      </section>

      <section class="meta-grid">
        <div>
          <p class="bill-title">Bill To</p>
          <p class="bill-name">${escapeHtml(context.tenantName)}</p>
          ${context.tenantEmail ? `<p class="small">${escapeHtml(context.tenantEmail)}</p>` : ""}
        </div>

        <div class="invoice-facts">
          <div class="fact"><span class="fact-label">Invoice No. :</span><span class="fact-value">${escapeHtml(invoice.invoiceNumber)}</span></div>
          <div class="fact"><span class="fact-label">Issue Date :</span><span class="fact-value">${escapeHtml(context.issueDateLabel)}</span></div>
          <div class="fact"><span class="fact-label">Due Date :</span><span class="fact-value">${escapeHtml(context.dueDateLabel)}</span></div>
          <div class="fact"><span class="fact-label">Reference :</span><span class="fact-value">${escapeHtml(invoice.id.slice(0, 8).toUpperCase())}</span></div>
        </div>
      </section>

      <section class="summary-strip">
        <div class="summary-cell summary-cell--violet">
          <p class="summary-label">Invoice No.</p>
          <p class="summary-value">${escapeHtml(invoice.invoiceNumber)}</p>
        </div>
        <div class="summary-cell summary-cell--violet">
          <p class="summary-label">Issue date</p>
          <p class="summary-value">${escapeHtml(context.issueDateLabel)}</p>
        </div>
        <div class="summary-cell summary-cell--violet">
          <p class="summary-label">Due date</p>
          <p class="summary-value">${escapeHtml(context.dueDateLabel)}</p>
        </div>
        <div class="summary-cell summary-cell--dark">
          <p class="summary-label">Total</p>
          <p class="summary-value">${formatMoney(invoice.totalAmount, invoice.currencyCode)}</p>
        </div>
      </section>

      <section>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit price (${escapeHtml(invoice.currencyCode)})</th>
              <th>Amount (${escapeHtml(invoice.currencyCode)})</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${periodLabel}</td>
              <td>1</td>
              <td>${formatMoney(invoice.totalAmount, invoice.currencyCode)}</td>
              <td>${formatMoney(invoice.totalAmount, invoice.currencyCode)}</td>
            </tr>
            ${invoice.amountPaid > 0 ? `<tr><td>Montant déjà payé</td><td>1</td><td>- ${formatMoney(invoice.amountPaid, invoice.currencyCode)}</td><td>- ${formatMoney(invoice.amountPaid, invoice.currencyCode)}</td></tr>` : ""}
            <tr class="total-row">
              <td colspan="3">Total (${escapeHtml(invoice.currencyCode)})</td>
              <td>${formatMoney(remaining, invoice.currencyCode)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer class="footer">
        ${organization?.emailSignature ? `<p class="small">${escapeHtml(organization.emailSignature)}</p>` : ""}
      </footer>
    </article>
  </body>
</html>`;
}

export function buildInvoiceEmailHtml(input: {
  tenantName: string;
  organization?: Organization | null;
  invoiceNumber: string;
  amountLabel: string;
  remainingLabel: string;
  dueDateLabel: string;
  issueDateLabel?: string;
  periodLabel?: string;
  currencyCode?: string;
}): string {
  const orgName = input.organization?.name ?? "Votre organisation";
  const issueDateLabel = input.issueDateLabel ?? "-";
  const periodLabel = input.periodLabel ?? "Facture ponctuelle";
  const currencyCode = input.currencyCode ?? "XAF";

  return `
    <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;padding:24px;color:#0f172a;background:#f3f4f6;">
      <div style="background:#fff;border:1px solid #d1d5db;padding:20px;">
        <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;color:#111827;">Invoice</h1>
        <p style="margin:0 0 10px;color:#374151;font-size:14px;">Bonjour ${escapeHtml(input.tenantName)}, votre facture émise par ${escapeHtml(orgName)} est disponible ci-dessous.</p>

        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid #d1d5db;margin:14px 0;">
          <div style="background:#5f5ff6;color:#fff;padding:10px 12px;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;opacity:.9;">Invoice No.</p>
            <p style="margin:0;font-size:13px;font-weight:700;">${escapeHtml(input.invoiceNumber)}</p>
          </div>
          <div style="background:#5f5ff6;color:#fff;padding:10px 12px;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;opacity:.9;">Issue date</p>
            <p style="margin:0;font-size:13px;font-weight:700;">${escapeHtml(issueDateLabel)}</p>
          </div>
          <div style="background:#5f5ff6;color:#fff;padding:10px 12px;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;opacity:.9;">Due date</p>
            <p style="margin:0;font-size:13px;font-weight:700;">${escapeHtml(input.dueDateLabel)}</p>
          </div>
          <div style="background:#2b2f38;color:#fff;padding:10px 12px;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;opacity:.8;">Total</p>
            <p style="margin:0;font-size:13px;font-weight:700;">${escapeHtml(input.amountLabel)}</p>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;border:1px solid #d1d5db;margin:0 0 14px;">
          <thead>
            <tr style="background:#2b2f38;color:#fff;">
              <th style="text-align:left;padding:9px 10px;font-size:11px;font-weight:600;">Description</th>
              <th style="text-align:left;padding:9px 10px;font-size:11px;font-weight:600;">Quantity</th>
              <th style="text-align:left;padding:9px 10px;font-size:11px;font-weight:600;">Unit price</th>
              <th style="text-align:right;padding:9px 10px;font-size:11px;font-weight:600;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:12px;">${escapeHtml(periodLabel)}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:12px;">1</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:12px;">${escapeHtml(input.amountLabel)}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:right;">${escapeHtml(input.amountLabel)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding:10px;font-size:12px;font-weight:700;text-align:right;">Total (${escapeHtml(currencyCode)})</td>
              <td style="padding:10px;font-size:12px;font-weight:700;text-align:right;">${escapeHtml(input.remainingLabel)}</td>
            </tr>
          </tbody>
        </table>

        <p style="margin:0;color:#475569;font-size:13px;">Une version téléchargeable de la facture est jointe à cet email.</p>
      </div>
    </div>
  `;
}
