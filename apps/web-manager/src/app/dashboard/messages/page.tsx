import { redirect } from "next/navigation";
import type {
  ManagerConversationListItem,
  PropertyWithUnitsView
} from "@hhousing/api-contracts";
import type { Tenant } from "@hhousing/domain";
import {
  listManagerConversations,
  listProperties,
  listTenants
} from "../../../api";
import {
  createMessageRepo,
  createRepositoryFromEnv,
  createTeamFunctionsRepo,
  createTenantLeaseRepo
} from "../../api/shared";
import {
  filterManagerConversationsByScope,
  filterTenantsByScope,
  getScopedPortfolioData
} from "../../../lib/operator-scope-portfolio";
import { getServerAuthSession } from "../../../lib/session";
import MessagingManagementPanel from "../../../components/messaging-management-panel";

interface PropertyOption {
  id: string;
  name: string;
}

export default async function MessagesPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const messageRepo = createMessageRepo();
  const teamFunctionsRepo = createTeamFunctionsRepo();
  const tenantLeaseRepo = createTenantLeaseRepo();
  const propertyRepoResult = createRepositoryFromEnv();
  const scopedPortfolio = await getScopedPortfolioData(session);

  const conversationsResult = await listManagerConversations(
    {
      session,
      propertyId: null,
      q: null
    },
    {
      repository: messageRepo,
      teamFunctionsRepository: teamFunctionsRepo
    }
  );

  const tenantsResult = await listTenants(
    {
      session,
      organizationId: session.organizationId ?? ""
    },
    {
      repository: tenantLeaseRepo,
      teamFunctionsRepository: teamFunctionsRepo
    }
  );

  const propertiesResult = propertyRepoResult.success
    ? await listProperties(
        {
          session,
          organizationId: session.organizationId ?? ""
        },
        {
          repository: propertyRepoResult.data,
          teamFunctionsRepository: teamFunctionsRepo
        }
      )
    : {
        status: 200,
        body: { success: true, data: { items: [] as PropertyWithUnitsView[] } }
      };

  const conversations: ManagerConversationListItem[] = conversationsResult.body.success
    ? filterManagerConversationsByScope(conversationsResult.body.data.conversations, scopedPortfolio)
    : [];

  const tenants: Tenant[] = tenantsResult.body.success
    ? filterTenantsByScope(tenantsResult.body.data.tenants, scopedPortfolio)
    : [];
  const properties: PropertyOption[] = propertiesResult.body.success
    ? propertiesResult.body.data.items.map((item) => ({
        id: item.property.id,
        name: item.property.name
      }))
    : [];

  return (
    <MessagingManagementPanel
      initialConversations={conversations}
      properties={properties}
      tenants={tenants.map((tenant) => ({ id: tenant.id, fullName: tenant.fullName }))}
    />
  );
}
