import type {
  OrganizationUsageSnapshot,
  PlatformBillingEstimate,
  PlatformBillingSettings,
  PlatformPaymentMethod,
  PlatformPaymentProvider,
  PlatformSubscriptionInvoice,
  PlatformSubscriptionInvoiceStatus
} from "@hhousing/domain";

export type {
  OrganizationUsageSnapshot,
  PlatformBillingEstimate,
  PlatformBillingSettings,
  PlatformPaymentMethod,
  PlatformPaymentProvider,
  PlatformSubscriptionInvoice,
  PlatformSubscriptionInvoiceStatus
};

export interface UpdatePlatformBillingSettingsInput {
  pricePerUnitAmount: number;
  currencyCode?: string;
  freePropertyThreshold: number;
}

export interface CreatePlatformPaymentMethodInput {
  id: string;
  provider: PlatformPaymentProvider;
  displayName: string;
  accountNumber: string;
  instructions?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdatePlatformPaymentMethodInput {
  id: string;
  provider?: PlatformPaymentProvider;
  displayName?: string;
  accountNumber?: string;
  instructions?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface ListPlatformSubscriptionInvoicesInput {
  organizationId?: string | null;
  period?: string | null;
  status?: PlatformSubscriptionInvoiceStatus | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}

export interface PlatformSubscriptionInvoiceListItem extends PlatformSubscriptionInvoice {
  organizationName: string;
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

export interface ReportPlatformInvoicePaymentInput {
  invoiceId: string;
  organizationId: string;
  reportedByUserId: string;
  paymentNote?: string | null;
}

export interface ConfirmPlatformInvoicePaidInput {
  invoiceId: string;
  confirmedByUserId: string;
}

export interface VoidPlatformInvoiceInput {
  invoiceId: string;
  voidReason?: string | null;
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

  listPaymentMethods(activeOnly?: boolean): Promise<PlatformPaymentMethod[]>;
  createPaymentMethod(input: CreatePlatformPaymentMethodInput): Promise<PlatformPaymentMethod>;
  updatePaymentMethod(input: UpdatePlatformPaymentMethodInput): Promise<PlatformPaymentMethod | null>;
  deletePaymentMethod(id: string): Promise<boolean>;

  getOrganizationUsage(organizationId: string): Promise<OrganizationUsageSnapshot | null>;
  listOrganizationUsage(): Promise<OrganizationUsageSnapshot[]>;
  estimateOrganizationBilling(organizationId: string): Promise<PlatformBillingEstimate | null>;

  listInvoices(input?: ListPlatformSubscriptionInvoicesInput): Promise<PlatformSubscriptionInvoiceListItem[]>;
  getInvoiceById(invoiceId: string): Promise<PlatformSubscriptionInvoiceListItem | null>;
  listInvoicesForOrganization(organizationId: string, limit?: number): Promise<PlatformSubscriptionInvoice[]>;
  getOpenOverdueInvoiceForOrganization(organizationId: string): Promise<PlatformSubscriptionInvoice | null>;

  createInvoiceIfAbsent(
    input: CreatePlatformSubscriptionInvoiceInput
  ): Promise<"created" | "exists">;
  reportInvoicePayment(input: ReportPlatformInvoicePaymentInput): Promise<PlatformSubscriptionInvoice | null>;
  confirmInvoicePaid(input: ConfirmPlatformInvoicePaidInput): Promise<PlatformSubscriptionInvoice | null>;
  voidInvoice(input: VoidPlatformInvoiceInput): Promise<PlatformSubscriptionInvoice | null>;

  generateInvoicesForPeriod(period: string, dueAtIso: string): Promise<GenerateSaasInvoicesResult>;
}
