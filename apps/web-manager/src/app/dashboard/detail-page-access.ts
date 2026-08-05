import type { AuthSession, MembershipAuthSession } from "@hhousing/api-contracts";
import { redirect } from "next/navigation";
import { requireOperatorSession, type OperatorAuthSession } from "../../api/shared";
import { getServerAuthSession } from "../../lib/session";

export async function getDashboardOperatorSession(): Promise<OperatorAuthSession> {
  const access = requireOperatorSession(await getServerAuthSession());

  if (!access.success) {
    if (access.code === "UNAUTHORIZED") {
      redirect("/login");
    }

    redirect("/account-type");
  }

  return access.data;
}

/** @deprecated Prefer getDashboardOperatorSession — kept for callers expecting AuthSession. */
export async function getDashboardAuthSession(): Promise<MembershipAuthSession> {
  return getDashboardOperatorSession();
}
