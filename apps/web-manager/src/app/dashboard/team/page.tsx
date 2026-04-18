import { redirect } from "next/navigation";
import { Permission, type TeamFunction } from "@hhousing/api-contracts";
import type { OrganizationMembership, TeamMemberInvitation } from "@hhousing/domain";
import { listOrganizationMembers, listTeamMemberInvitations } from "../../../api";
import { createAuthRepo, createTeamFunctionsRepo } from "../../api/shared";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";
import TeamManagementPanel from "../../../components/team-management-panel";

type TeamDashboardMember = OrganizationMembership & {
  displayName: string;
  email: string | null;
  functions: TeamFunction[];
};

type SupabaseAdminUser = {
  id: string;
  email?: string | null;
  user_metadata?: unknown;
};

type MemberIdentity = {
  displayName: string;
  email: string | null;
};

function isHigherPriorityMembership(
  current: TeamDashboardMember,
  candidate: TeamDashboardMember
): boolean {
  if (current.role === "landlord") {
    return false;
  }

  if (candidate.role === "landlord") {
    return true;
  }

  return new Date(candidate.createdAtIso).getTime() < new Date(current.createdAtIso).getTime();
}

function mergeMemberFunctions(
  left: TeamFunction[],
  right: TeamFunction[]
): TeamFunction[] {
  const byCode = new Map<string, TeamFunction>();

  for (const functionItem of [...left, ...right]) {
    if (!byCode.has(functionItem.functionCode)) {
      byCode.set(functionItem.functionCode, functionItem);
    }
  }

  return Array.from(byCode.values());
}

function dedupeMembersByUser(members: TeamDashboardMember[]): TeamDashboardMember[] {
  const byUserId = new Map<string, TeamDashboardMember>();

  for (const member of members) {
    const current = byUserId.get(member.userId);
    if (!current) {
      byUserId.set(member.userId, member);
      continue;
    }

    const primary = isHigherPriorityMembership(current, member) ? member : current;
    const secondary = primary.id === current.id ? member : current;

    byUserId.set(primary.userId, {
      ...primary,
      functions: mergeMemberFunctions(primary.functions, secondary.functions)
    });
  }

  return Array.from(byUserId.values()).sort(
    (left, right) => new Date(left.createdAtIso).getTime() - new Date(right.createdAtIso).getTime()
  );
}

function memberHasPermission(functions: TeamFunction[], permission: Permission): boolean {
  return functions.some(
    (teamFunction) =>
      teamFunction.permissions.includes("*") || teamFunction.permissions.includes(permission)
  );
}

function readUserMetadataName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const maybeFullName = "full_name" in metadata ? metadata.full_name : undefined;
  if (typeof maybeFullName === "string" && maybeFullName.trim().length > 0) {
    return maybeFullName.trim();
  }

  const maybeName = "name" in metadata ? metadata.name : undefined;
  if (typeof maybeName === "string" && maybeName.trim().length > 0) {
    return maybeName.trim();
  }

  return null;
}

function buildFallbackName(email: string | null, role: OrganizationMembership["role"]): string {
  if (email) {
    const [localPart] = email.split("@");
    if (localPart && localPart.trim().length > 0) {
      return localPart;
    }
  }

  return role === "landlord" ? "Compte principal" : "Membre d'equipe";
}

async function listMemberIdentities(userIds: string[]): Promise<Map<string, MemberIdentity>> {
  const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseAdminUrl || !supabaseServiceRoleKey || userIds.length === 0) {
    return new Map();
  }

  const response = await fetch(`${supabaseAdminUrl}/auth/v1/admin/users`, {
    method: "GET",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return new Map();
  }

  const payload = (await response.json()) as { users?: SupabaseAdminUser[] };
  const ids = new Set(userIds);

  return new Map(
    (payload.users ?? [])
      .filter((user) => ids.has(user.id))
      .map((user) => {
        const email = typeof user.email === "string" && user.email.trim().length > 0
          ? user.email.trim()
          : null;

        return [
          user.id,
          {
            displayName: readUserMetadataName(user.user_metadata) ?? buildFallbackName(email, "property_manager"),
            email
          }
        ] satisfies [string, MemberIdentity];
      })
  );
}

export default async function TeamPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("organization");

  const authRepository = createAuthRepo();
  const teamFunctionsRepository = createTeamFunctionsRepo();

  const [membersResult, invitationsResult] = await Promise.all([
    listOrganizationMembers(
      {
        session,
        organizationId: session.organizationId
      },
      {
        repository: authRepository
      }
    ),
    listTeamMemberInvitations(
      {
        session,
        organizationId: session.organizationId
      },
      {
        repository: authRepository
      }
    )
  ]);

  const memberships: OrganizationMembership[] = membersResult.body.success
    ? membersResult.body.data.memberships
    : [];
  const invitations: TeamMemberInvitation[] = invitationsResult.body.success
    ? invitationsResult.body.data.invitations.filter(
        (invitation) => invitation.usedAtIso === null && invitation.revokedAtIso === null
      )
    : [];
  const memberIdentities = await listMemberIdentities(memberships.map((membership) => membership.userId));

  let memberFunctionsById = new Map<string, TeamFunction[]>();
  let availableFunctions: TeamFunction[] = [];

  try {
    await teamFunctionsRepository.ensureDefaultFunctionsForOrganization(session.organizationId);

    const [membersWithFunctions, functions] = await Promise.all([
      teamFunctionsRepository.listOrganizationMembersWithFunctions(session.organizationId),
      teamFunctionsRepository.listFunctionsByOrganization(session.organizationId)
    ]);

    memberFunctionsById = new Map(
      membersWithFunctions.map((member) => [member.memberId, member.functions])
    );
    availableFunctions = functions;
  } catch (error) {
    const maybeCode =
      error instanceof Error ? (error as Error & { code?: string }).code : undefined;
    if (maybeCode !== "42P01") {
      throw error;
    }
  }

  const members = dedupeMembersByUser(memberships.map((membership) => ({
    ...membership,
    displayName:
      memberIdentities.get(membership.userId)?.displayName ??
      buildFallbackName(memberIdentities.get(membership.userId)?.email ?? null, membership.role),
    email: memberIdentities.get(membership.userId)?.email ?? null,
    functions: memberFunctionsById.get(membership.id) ?? []
  }))); 
  const accountOwner = members
    .filter((membership) => membership.role === "landlord" || membership.role === "property_manager")
    .sort(
      (left, right) =>
        new Date(left.createdAtIso).getTime() - new Date(right.createdAtIso).getTime()
    )[0] ?? null;
  const currentMember = members.find((membership) => membership.userId === session.userId) ?? null;
  const canManageTeam =
    session.role === "landlord" ||
    (session.role === "property_manager" &&
      (accountOwner?.userId === session.userId ||
        (currentMember !== null && memberHasPermission(currentMember.functions, Permission.MANAGE_TEAM))));

  return (
    <div className="p-8">
      <TeamManagementPanel
        members={members}
        invitations={invitations}
        availableFunctions={availableFunctions}
        accountOwner={accountOwner}
        currentMember={currentMember}
        currentUserId={session.userId}
        canAssignAdmin={session.role === "landlord"}
        inviteAuthority={canManageTeam}
        canManageTeam={canManageTeam}
      />
    </div>
  );
}
