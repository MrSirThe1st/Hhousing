import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createRepositoryFromEnv } from "../../../../api/shared";
import OwnerClientEditForm from "../../../../../components/owner-client-edit-form";
import { getServerAuthSession } from "../../../../../lib/session";

export default async function ClientEditPage(
  { params }: { params: Promise<{ id: string }> }
): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const repoResult = createRepositoryFromEnv();

  if (!repoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion a la base de donnees.</div>;
  }

  const client = await repoResult.data.getOwnerById(id, session.organizationId);

  if (!client || client.ownerType !== "client") {
    notFound();
  }

  return (
    <div className="space-y-6 p-8">
      <Link href={`/dashboard/clients/${client.id}`} className="inline-block text-sm text-[#0063fe] hover:underline">
        ← Retour a la fiche client
      </Link>

      <OwnerClientEditForm organizationId={session.organizationId} client={client} />
    </div>
  );
}
