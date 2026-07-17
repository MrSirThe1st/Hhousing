import type { Tenant } from "@hhousing/domain";

export interface CreateTenantLoginOtpInput {
  id: string;
  organizationId: string;
  tenantId: string;
  phoneNormalized: string;
  codeHash: string;
  expiresAtIso: string;
}

export interface TenantLoginOtpRecord {
  id: string;
  organizationId: string;
  tenantId: string;
  phoneNormalized: string;
  codeHash: string;
  expiresAtIso: string;
  consumedAtIso: string | null;
  attemptCount: number;
  createdAtIso: string;
}

export interface TenantLoginOtpRepository {
  createOtp(input: CreateTenantLoginOtpInput): Promise<TenantLoginOtpRecord>;
  getLatestActiveOtp(phoneNormalized: string): Promise<TenantLoginOtpRecord | null>;
  incrementAttemptCount(otpId: string): Promise<TenantLoginOtpRecord | null>;
  markConsumed(otpId: string): Promise<TenantLoginOtpRecord | null>;
  invalidateActiveOtps(phoneNormalized: string): Promise<void>;
}

export type TenantWithPhoneLookup = Tenant & {
  phoneNormalized: string | null;
};
