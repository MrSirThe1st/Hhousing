import { redirect } from "next/navigation";
import type { OrganizationMembership } from "@hhousing/domain";
import { listOrganizationMembers } from "../../../api";
import type { TeamFunction } from "@hhousing/api-contracts";
import { createAuthRepo, createTeamFunctionsRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";
import TeamManagementPanel from "../../../components/team-management-panel";

function isMissingTeamFunctionsSchema(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const maybeCode = (error as Error & { code?: string }).code;
  return maybeCode === "42P01";
}

export default async function TeamPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const authRepository = createAuthRepo();
  const teamFunctionsRepository = createTeamFunctionsRepo();

  const membersResult = await listOrganizationMembers(
    {
      session,
      organizationId: session.organizationId
    },
    {
      repository: authRepository
    }
  );

  let functionsUnavailable = false;
  let availableFunctions: TeamFunction[] = [];
  let membersWithFunctions: Array<{ memberId: string; functions: TeamFunction[] }> = [];

  try {
    const [functions, members] = await Promise.all([
      teamFunctionsRepository.listFunctionsByOrganization(session.organizationId),
      teamFunctionsRepository.listOrganizationMembersWithFunctions(session.organizationId)
    ]);
    availableFunctions = functions;
    membersWithFunctions = members;
  } catch (error) {
    if (!isMissingTeamFunctionsSchema(error)) {
      throw error;
    }
    functionsUnavailable = true;
  }

  const memberships: OrganizationMembership[] = membersResult.body.success
    ? membersResult.body.data.memberships
    : [];
  const functionsByMemberId = new Map(
    membersWithFunctions.map((member) => [member.memberId, member.functions])
  );
  const members = memberships.map((membership) => ({
    membership,
    functions: functionsByMemberId.get(membership.id) ?? []
  }));

  return (
    <TeamManagementPanel
      organizationId={session.organizationId}
      inviterRole={session.role === "landlord" ? "landlord" : "property_manager"}
      members={members}
      availableFunctions={availableFunctions}
      functionsUnavailable={functionsUnavailable}
    />
  );
}
