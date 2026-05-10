// Domain types (inlined to avoid workspace dependency in EAS builds)
export type UserRole = "tenant" | "landlord" | "property_manager" | "platform_admin";

export interface Tenant {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  phoneNumber?: string;
  phone?: string;
  moveInDate?: string;
  organizationId?: string;
}

export interface Lease {
  id: string;
  tenantId: string;
  unitId: string;
  startDate: string;
  endDate?: string;
  monthlyRent?: number;
  monthlyRentAmount?: number;
  securityDeposit?: number;
  currencyCode?: string;
}

export interface Payment {
  id: string;
  leaseId: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  paidDate?: string;
  paymentKind?: string;
  currencyCode?: string;
}

export interface MaintenanceRequest {
  id: string;
  unitId: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
  createdAt: string;
}

export interface MaintenanceTimelineEvent {
  id: string;
  maintenanceRequestId: string;
  type: string;
  description: string;
  createdAt: string;
  createdBy?: string;
}

export interface Document {
  id: string;
  name?: string;
  fileName?: string;
  type?: DocumentType;
  documentType?: DocumentType;
  url?: string;
  fileUrl?: string;
  fileSize?: number;
  createdAt?: string;
  createdAtIso?: string;
}

export type DocumentType = "lease_agreement" | "receipt" | "notice" | "lease" | "agreement" | "invoice" | "maintenance" | "other";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
}
