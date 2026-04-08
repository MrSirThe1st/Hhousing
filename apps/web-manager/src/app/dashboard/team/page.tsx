import { redirect } from "next/navigation";
import type { OrganizationMembership, TeamMemberInvitation } from "@hhousing/domain";
import { listOrganizationMembers, listTeamMemberInvitations } from "../../../api";
import { createAuthRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";
import TeamManagementPanel from "../../../components/team-management-panel";

export default async function TeamPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const authRepository = createAuthRepo();

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

  return (
    <TeamManagementPanel
      organizationId={session.organizationId}
      members={memberships}
      invitations={invitations}
    />
  );
}
