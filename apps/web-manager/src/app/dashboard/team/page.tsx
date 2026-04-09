import { redirect } from "next/navigation";
import { Permission, type TeamFunction } from "@hhousing/api-contracts";
import type { OrganizationMembership, TeamMemberInvitation } from "@hhousing/domain";
import { listOrganizationMembers, listTeamMemberInvitations } from "../../../api";
import { createAuthRepo, createTeamFunctionsRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";
import TeamManagementPanel from "../../../components/team-management-panel";

type TeamDashboardMember = OrganizationMembership & {
  functions: TeamFunction[];
};

type TeamActivityItem = {
  id: string;
  occurredAtIso: string;
  title: string;
  detail: string;
  tone: "blue" | "emerald" | "amber" | "slate";
};

function memberHasPermission(functions: TeamFunction[], permission: Permission): boolean {
  return functions.some(
    (teamFunction) =>
      teamFunction.permissions.includes("*") || teamFunction.permissions.includes(permission)
  );
}

function buildTeamActivity(
  memberships: OrganizationMembership[],
  invitations: TeamMemberInvitation[]
): TeamActivityItem[] {
  const memberEvents = memberships
    .filter((membership) => membership.role !== "tenant")
    .map((membership) => ({
      id: `member-${membership.id}`,
      occurredAtIso: membership.createdAtIso,
      title: "Membre actif",
      detail:
        membership.role === "landlord"
          ? "Le compte principal est actif dans l'organisation."
          : `Le membre ${membership.userId.slice(0, 8)} a rejoint l'equipe.`,
      tone: membership.role === "landlord" ? "blue" : "emerald"
    } satisfies TeamActivityItem));

  const invitationEvents = invitations.flatMap((invitation) => {
    const events: TeamActivityItem[] = [
      {
        id: `invite-sent-${invitation.id}`,
        occurredAtIso: invitation.createdAtIso,
        title: "Invitation envoyee",
        detail: `${invitation.email} a recu une invitation equipe.`,
        tone: "slate"
      }
    ];

    if (invitation.usedAtIso) {
      events.push({
        id: `invite-used-${invitation.id}`,
        occurredAtIso: invitation.usedAtIso,
        title: "Invitation acceptee",
        detail: `${invitation.email} a active son acces personnel.`,
        tone: "emerald"
      });
    }

    if (invitation.revokedAtIso) {
      events.push({
        id: `invite-revoked-${invitation.id}`,
        occurredAtIso: invitation.revokedAtIso,
        title: "Invitation annulee",
        detail: `${invitation.email} n'a plus d'invitation active.`,
        tone: "amber"
      });
    }

    return events;
  });

  return [...memberEvents, ...invitationEvents]
    .sort(
      (left, right) =>
        new Date(right.occurredAtIso).getTime() - new Date(left.occurredAtIso).getTime()
    )
    .slice(0, 12);
}

export default async function TeamPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

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
  const allInvitations: TeamMemberInvitation[] = invitationsResult.body.success
    ? invitationsResult.body.data.invitations
    : [];
  const invitations: TeamMemberInvitation[] = invitationsResult.body.success
    ? invitationsResult.body.data.invitations.filter(
        (invitation) => invitation.usedAtIso === null && invitation.revokedAtIso === null
      )
    : [];

  let memberFunctionsById = new Map<string, TeamFunction[]>();
  let availableFunctions: TeamFunction[] = [];

  try {
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

  const members: TeamDashboardMember[] = memberships.map((membership) => ({
    ...membership,
    functions: memberFunctionsById.get(membership.id) ?? []
  }));
  const accountOwner = memberships
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
  const teamActivity = buildTeamActivity(memberships, allInvitations);

  return (
    <TeamManagementPanel
      organizationId={session.organizationId}
      members={members}
      invitations={invitations}
      availableFunctions={availableFunctions}
      teamActivity={teamActivity}
      accountOwner={accountOwner}
      currentUserId={session.userId}
      canAssignAdmin={session.role === "landlord"}
      inviteAuthority={canManageTeam}
      canManageTeam={canManageTeam}
    />
  );
}
