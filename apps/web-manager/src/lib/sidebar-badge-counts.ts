import type { MembershipAuthSession } from "@hhousing/api-contracts";
import {
  createListingRepo,
  createPaymentRepo
} from "../app/api/shared";
import { getNow } from "./time";

export interface SidebarBadgeCounts {
  listings: number;
  payments: number;
}

function createEmptyCounts(): SidebarBadgeCounts {
  return {
    listings: 0,
    payments: 0
  };
}

/**
 * Org-scoped badge counts via SQL COUNT only — no full table loads.
 * V1: messaging deferred — do not count unread messages on this path.
 */
export async function getSidebarBadgeCounts(session: MembershipAuthSession): Promise<SidebarBadgeCounts> {
  if (!session.organizationId) {
    return createEmptyCounts();
  }

  const todayIsoDate = getNow().toISOString().slice(0, 10);

  try {
    const [listings, payments] = await Promise.all([
      createListingRepo().countOpenListingApplications(session.organizationId),
      createPaymentRepo().countSidebarPaymentBadges(session.organizationId, todayIsoDate)
    ]);

    return { listings, payments };
  } catch (error) {
    console.error("Failed to load sidebar badge counts", error);
    return createEmptyCounts();
  }
}
