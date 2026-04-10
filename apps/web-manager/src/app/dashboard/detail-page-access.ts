import type { AuthSession } from "@hhousing/api-contracts";
import { redirect } from "next/navigation";
import { requireOperatorSession } from "../../api/shared";
import { getServerAuthSession } from "../../lib/session";

export async function getDashboardOperatorSession(): Promise<AuthSession> {
  const access = requireOperatorSession(await getServerAuthSession());

  if (!access.success) {
    if (access.code === "UNAUTHORIZED") {
      redirect("/login");
    }

    redirect("/account-type");
  }

  return access.data;
}
