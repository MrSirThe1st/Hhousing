import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createRepositoryFromEnv } from "../../../../api/shared";
import ClientAssignmentWorkspace from "../../../../../components/client-assignment-workspace";
import OwnerInvitationPanel from "../../../../../components/owner-invitation-panel";
import { getServerAuthSession } from "../../../../../lib/session";

export default async function ClientAssignmentPage(
  {
    params,
    searchParams
  }: {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ inviteEmail?: string }>;
  }
): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const query = await searchParams;
  const inviteEmail = query?.inviteEmail?.trim() ?? "";
  const repoResult = createRepositoryFromEnv();

  if (!repoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion a la base de donnees.</div>;
  }

  const [client, properties, allProperties] = await Promise.all([
    repoResult.data.getOwnerById(id, session.organizationId),
    repoResult.data.listPropertiesWithUnits(session.organizationId, { ownerId: id }),
    repoResult.data.listPropertiesWithUnits(session.organizationId)
  ]);

  if (!client || client.ownerType !== "client") {
    notFound();
  }

  const assignedPropertyIds = new Set(properties.map((item) => item.property.id));
  const assignedProperties = properties
    .map((item) => ({
      id: item.property.id,
      name: item.property.name,
      city: item.property.city,
      unitCount: item.units.length,
      occupiedUnitCount: item.units.filter((unit) => unit.status === "occupied").length
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));

  const assignableProperties = allProperties
    .filter((item) => !assignedPropertyIds.has(item.property.id))
    .map((item) => ({
      id: item.property.id,
      name: item.property.name,
      city: item.property.city,
      unitCount: item.units.length,
      occupiedUnitCount: item.units.filter((unit) => unit.status === "occupied").length
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));

  return (
    <div className="space-y-6 p-8">
      <Link href={`/dashboard/clients/${client.id}`} className="inline-block text-sm text-[#0063fe] hover:underline">
        ← Retour a la fiche client
      </Link>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#010a19]">Affectation et invitation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerer les biens rattaches et envoyer l&apos;invitation proprietaire pour {client.name}.
        </p>
      </section>

      <ClientAssignmentWorkspace
        clientId={client.id}
        assignableProperties={assignableProperties}
        assignedProperties={assignedProperties}
      />

      <OwnerInvitationPanel ownerId={client.id} ownerName={client.name} initialEmail={inviteEmail} />
    </div>
  );
}
