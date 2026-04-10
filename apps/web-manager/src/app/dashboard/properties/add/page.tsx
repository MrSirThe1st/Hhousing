import { redirect } from "next/navigation";
import type { Owner } from "@hhousing/domain";
import { createRepositoryFromEnv } from "../../../api/shared";
import PropertyCreateForm from "../../../../components/property-create-form";
import { getServerAuthSession } from "../../../../lib/session";

export default async function AddPropertyPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const repoResult = createRepositoryFromEnv();

  if (!repoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  const owners: Owner[] = await repoResult.data.listOwners(session.organizationId ?? "");

  return (
    <PropertyCreateForm
      organizationId={session.organizationId ?? ""}
      owners={owners}
    />
  );
}