import { describe, expect, it, vi } from "vitest";
import { Permission, TeamFunctionCode, type TeamFunction } from "@hhousing/api-contracts";
import type { TenantLeaseRepository } from "@hhousing/data-access";
import { createTenantInvitation } from "./tenant-invitations";

function createTeamFunctionsRepositoryMock() {
  const functions: TeamFunction[] = [
    {
      id: "func-1",
      organizationId: "org-1",
      functionCode: TeamFunctionCode.LEASING_AGENT,
      displayName: "Leasing",
      description: null,
      permissions: [Permission.MANAGE_TENANTS],
      createdAt: new Date("2026-01-01T00:00:00.000Z")
    }
  ];

  return {
    listMemberFunctions: vi.fn().mockResolvedValue(functions)
  };
}

describe("createTenantInvitation notifications", () => {
  it("sends email and WhatsApp in parallel when both are available", async () => {
    const sendInvitationEmail = vi.fn().mockResolvedValue(undefined);
    const sendInvitationWhatsApp = vi.fn().mockResolvedValue(undefined);

    const result = await createTenantInvitation(
      {
        tenantId: "tenant-1",
        session: {
          userId: "user-1",
          role: "landlord",
          organizationId: "org-1",
          capabilities: { canOwnProperties: true },
          memberships: [{
            id: "member-1",
            userId: "user-1",
            organizationId: "org-1",
            organizationName: "Org 1",
            role: "landlord",
            status: "active",
            capabilities: { canOwnProperties: true },
            createdAtIso: "2026-01-01T00:00:00.000Z"
          }]
        }
      },
      {
        repository: {
          getTenantById: vi.fn().mockResolvedValue({
            id: "tenant-1",
            organizationId: "org-1",
            authUserId: null,
            fullName: "Jane Tenant",
            email: "tenant@example.com",
            phone: "+243 812 345 678",
            whatsappNumber: null,
            whatsappOptIn: false,
            dateOfBirth: null,
            photoUrl: null,
            employmentStatus: null,
            jobTitle: null,
            monthlyIncome: null,
            numberOfOccupants: null,
            createdAtIso: "2026-01-01T00:00:00.000Z"
          }),
          findTenantByNormalizedPhone: vi.fn(),
          revokeActiveTenantInvitations: vi.fn().mockResolvedValue(undefined),
          createTenantInvitation: vi.fn().mockResolvedValue({
            id: "tin-1",
            tenantId: "tenant-1",
            organizationId: "org-1",
            email: "tenant@example.com",
            expiresAtIso: "2026-04-09T00:00:00.000Z",
            usedAtIso: null,
            revokedAtIso: null,
            createdAtIso: "2026-01-01T00:00:00.000Z"
          })
        } as unknown as TenantLeaseRepository,
        teamFunctionsRepository: createTeamFunctionsRepositoryMock(),
        createId: () => "tin-1",
        createToken: () => "token-123",
        inviteLinkBaseUrl: "hhousing-tenant://accept-invite",
        organizationRepository: {
          getOrganizationById: vi.fn().mockResolvedValue({
            id: "org-1",
            name: "Haraka Property"
          })
        },
        notificationChannels: ["email", "whatsapp"],
        sendInvitationEmail,
        sendInvitationWhatsApp
      }
    );

    expect(result.status).toBe(201);
    expect(result.body.success).toBe(true);
    if (result.body.success) {
      expect(result.body.data.notifications).toEqual([
        { channel: "email", status: "sent" },
        { channel: "whatsapp", status: "sent" }
      ]);
    }
    expect(sendInvitationEmail).toHaveBeenCalledOnce();
    expect(sendInvitationWhatsApp).toHaveBeenCalledOnce();
  });

  it("skips WhatsApp when tenant phone is missing", async () => {
    const sendInvitationEmail = vi.fn().mockResolvedValue(undefined);
    const sendInvitationWhatsApp = vi.fn().mockResolvedValue(undefined);

    const result = await createTenantInvitation(
      {
        tenantId: "tenant-1",
        session: {
          userId: "user-1",
          role: "landlord",
          organizationId: "org-1",
          capabilities: { canOwnProperties: true },
          memberships: [{
            id: "member-1",
            userId: "user-1",
            organizationId: "org-1",
            organizationName: "Org 1",
            role: "landlord",
            status: "active",
            capabilities: { canOwnProperties: true },
            createdAtIso: "2026-01-01T00:00:00.000Z"
          }]
        }
      },
      {
        repository: {
          getTenantById: vi.fn().mockResolvedValue({
            id: "tenant-1",
            organizationId: "org-1",
            authUserId: null,
            fullName: "Jane Tenant",
            email: "tenant@example.com",
            phone: null,
            whatsappNumber: null,
            whatsappOptIn: false,
            dateOfBirth: null,
            photoUrl: null,
            employmentStatus: null,
            jobTitle: null,
            monthlyIncome: null,
            numberOfOccupants: null,
            createdAtIso: "2026-01-01T00:00:00.000Z"
          }),
          findTenantByNormalizedPhone: vi.fn(),
          revokeActiveTenantInvitations: vi.fn().mockResolvedValue(undefined),
          createTenantInvitation: vi.fn().mockResolvedValue({
            id: "tin-1",
            tenantId: "tenant-1",
            organizationId: "org-1",
            email: "tenant@example.com",
            expiresAtIso: "2026-04-09T00:00:00.000Z",
            usedAtIso: null,
            revokedAtIso: null,
            createdAtIso: "2026-01-01T00:00:00.000Z"
          })
        } as unknown as TenantLeaseRepository,
        teamFunctionsRepository: createTeamFunctionsRepositoryMock(),
        createId: () => "tin-1",
        createToken: () => "token-123",
        inviteLinkBaseUrl: "hhousing-tenant://accept-invite",
        notificationChannels: ["email", "whatsapp"],
        sendInvitationEmail,
        sendInvitationWhatsApp
      }
    );

    expect(result.body.success).toBe(true);
    if (result.body.success) {
      expect(result.body.data.notifications).toEqual([
        { channel: "email", status: "sent" },
        { channel: "whatsapp", status: "skipped" }
      ]);
    }
    expect(sendInvitationWhatsApp).not.toHaveBeenCalled();
  });
});
