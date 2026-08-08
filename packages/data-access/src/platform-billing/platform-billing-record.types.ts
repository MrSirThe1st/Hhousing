import type {
  OrganizationUsageSnapshot,
  PlatformBillingEstimate,
  PlatformBillingSettings,
  PlatformSaasPaymentMethod,
  PlatformSubscriptionInvoice,
  PlatformSubscriptionInvoiceStatus
} from "@hhousing/domain";

export type {
  OrganizationUsageSnapshot,
  PlatformBillingEstimate,
  PlatformBillingSettings,
  PlatformSaasPaymentMethod,
  PlatformSubscriptionInvoice,
  PlatformSubscriptionInvoiceStatus
};

export interface UpdatePlatformBillingSettingsInput {
  pricePerUnitAmount: number;
  currencyCode?: string;
  freePropertyThreshold: number;
}

export interface ListPlatformSubscriptionInvoicesInput {
  organizationId?: string | null;
  period?: string | null;
  status?: PlatformSubscriptionInvoiceStatus | null;
  search?: string | null;
  /** When true, only issued invoices past due_at. Implies status issued. */
  overdueOnly?: boolean;
  /** When true, only issued invoices with a client payment signal. */
  paymentReportedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface AdminBillingDashboard {
  currencyCode: string;
  /** Approximate MRR from current billing period invoices (issued + paid). */
  mrrAmount: number;
  openReceivableAmount: number;
  openInvoiceCount: number;
  overdueReceivableAmount: number;
  overdueInvoiceCount: number;
  collectedMonthAmount: number;
  collectedMonthCount: number;
  collectedYearAmount: number;
}

export interface PlatformSubscriptionInvoiceListItem extends PlatformSubscriptionInvoice {
  organizationName: string;
}

export interface OrganizationBillingSnapshot {
  organizationId: string;
  organizationName: string;
  propertyCount: number;
  unitCount: number;
  openInvoice: PlatformSubscriptionInvoice | null;
}

export interface CreatePlatformSubscriptionInvoiceInput {
  id: string;
  organizationId: string;
  period: string;
  propertyCount: number;
  unitCount: number;
  pricePerUnitAmount: number;
  amountDue: number;
  currencyCode: string;
  dueAtIso: string;
}

export interface ConfirmPlatformInvoicePaidInput {
  invoiceId: string;
  confirmedByUserId: string;
}

export interface VoidPlatformInvoiceInput {
  invoiceId: string;
  voidReason?: string | null;
}

export interface ReportPlatformInvoicePaymentInput {
  invoiceId: string;
  reportedByUserId: string;
  paymentMethod?: PlatformSaasPaymentMethod | null;
  paymentNote?: string | null;
}

export interface GenerateSaasInvoicesResult {
  period: string;
  created: number;
  skippedFree: number;
  skippedExisting: number;
  failures: Array<{ organizationId: string; error: string }>;
  invoiceIds: string[];
}

export interface PlatformBillingRepository {
  getBillingSettings(): Promise<PlatformBillingSettings>;
  updateBillingSettings(input: UpdatePlatformBillingSettingsInput): Promise<PlatformBillingSettings>;

  getOrganizationUsage(organizationId: string): Promise<OrganizationUsageSnapshot | null>;
  listOrganizationUsage(): Promise<OrganizationUsageSnapshot[]>;
  estimateOrganizationBilling(organizationId: string): Promise<PlatformBillingEstimate | null>;

  getAdminBillingDashboard(): Promise<AdminBillingDashboard>;
  listOrganizationBillingSnapshots(): Promise<OrganizationBillingSnapshot[]>;
  listInvoices(input?: ListPlatformSubscriptionInvoicesInput): Promise<PlatformSubscriptionInvoiceListItem[]>;
  getInvoiceById(invoiceId: string): Promise<PlatformSubscriptionInvoiceListItem | null>;
  listInvoicesForOrganization(organizationId: string, limit?: number): Promise<PlatformSubscriptionInvoice[]>;
  getOpenOverdueInvoiceForOrganization(organizationId: string): Promise<PlatformSubscriptionInvoice | null>;

  createInvoiceIfAbsent(
    input: CreatePlatformSubscriptionInvoiceInput
  ): Promise<"created" | "exists">;
  confirmInvoicePaid(input: ConfirmPlatformInvoicePaidInput): Promise<PlatformSubscriptionInvoice | null>;
  voidInvoice(input: VoidPlatformInvoiceInput): Promise<PlatformSubscriptionInvoice | null>;
  reportInvoicePayment(
    input: ReportPlatformInvoicePaymentInput
  ): Promise<PlatformSubscriptionInvoice | null>;

  generateInvoicesForPeriod(period: string, dueAtIso: string): Promise<GenerateSaasInvoicesResult>;
}
