/**
 * Permission enumeration
 * Fine-grained capabilities that can be assigned to team functions
 * Functions grant users these permissions
 */

export enum Permission {
  // Lease operations
  CREATE_LEASE = 'create_lease',
  EDIT_LEASE = 'edit_lease',
  VIEW_LEASE = 'view_lease',

  // Tenant operations
  MANAGE_TENANTS = 'manage_tenants',
  VIEW_TENANTS = 'view_tenants',

  // Payment operations
  VIEW_PAYMENTS = 'view_payments',
  RECORD_PAYMENT = 'record_payment',
  EXPORT_PAYMENT_REPORTS = 'export_payment_reports',
  VIEW_INCOME_REPORTS = 'view_income_reports',

  // Maintenance operations
  MANAGE_MAINTENANCE = 'manage_maintenance',
  ASSIGN_VENDORS = 'assign_vendors',
  VIEW_MAINTENANCE = 'view_maintenance',
  UPDATE_MAINTENANCE_STATUS = 'update_maintenance_status',

  // Team operations
  MESSAGE_TENANTS = 'message_tenants',
  VIEW_DOCUMENTS = 'view_documents',
  UPLOAD_DOCUMENTS = 'upload_documents',

  // Admin operations (org-level)
  MANAGE_TEAM = 'manage_team',
  VIEW_REPORTS = 'view_reports',
  MANAGE_ORG = 'manage_org',
}

/**
 * Function code enumeration
 * Predefined team member function/role templates
 */
export enum TeamFunctionCode {
  LEASING_AGENT = 'LEASING_AGENT',
  ACCOUNTANT = 'ACCOUNTANT',
  MAINTENANCE_MANAGER = 'MAINTENANCE_MANAGER',
  ADMIN = 'ADMIN',
}

/**
 * Team function domain type
 */
export interface TeamFunction {
  id: string;
  organizationId: string;
  functionCode: TeamFunctionCode;
  displayName: string;
  description: string | null;
  permissions: string[]; // Array of Permission values or '*' for all
  createdAt: Date;
}

/**
 * Member function assignment domain type
 */
export interface MemberFunction {
  id: string;
  organizationId: string;
  memberId: string;
  functionId: string;
  assignedBy?: string;
  createdAt: Date;
}

/**
 * Member with functions (for list operations)
 */
export interface MemberWithFunctions {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: 'landlord' | 'property_manager' | 'tenant';
  functions: TeamFunction[];
  status: 'active' | 'invited' | 'inactive';
  createdAt: Date;
}
