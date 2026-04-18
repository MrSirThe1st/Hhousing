import OperatorProfilePanel from "../../../components/operator-profile-panel";
import { getServerAuthSession } from "../../../lib/session";
import { redirect } from "next/navigation";

export default async function DashboardProfilePage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role === "tenant") {
    redirect("/account-type");
  }

  return (
    <div className="p-8">
      <OperatorProfilePanel />
    </div>
  );
}
