import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceProviderRepositoryFromEnv } from "@hhousing/data-access";
import AdminServiceProviderDetailActions from "../../../../components/admin-service-provider-detail-actions";

export default async function AdminServiceProviderDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const repo = createServiceProviderRepositoryFromEnv(process.env);
  const [provider, visibility] = await Promise.all([
    repo.getProviderById(id),
    repo.getProviderVisibilityStats(id)
  ]);

  if (!provider) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/service-providers"
          className="text-sm font-medium text-slate-500 hover:underline"
        >
          ← Prestataires
        </Link>
        <h2 className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
          {provider.name}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{provider.categoryName}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Informations</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Nom</dt>
            <dd className="font-medium text-[#010a19] dark:text-white">{provider.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Catégorie</dt>
            <dd className="font-medium text-[#010a19] dark:text-white">{provider.categoryName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Téléphone</dt>
            <dd className="font-medium text-[#010a19] dark:text-white">{provider.phone}</dd>
          </div>
          <div>
            <dt className="text-slate-500">WhatsApp</dt>
            <dd className="font-medium text-[#010a19] dark:text-white">
              {provider.whatsappPhone ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Ville</dt>
            <dd className="font-medium text-[#010a19] dark:text-white">
              {provider.city ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Quartier</dt>
            <dd className="font-medium text-[#010a19] dark:text-white">
              {provider.quartier ?? "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Notes</dt>
            <dd className="font-medium text-[#010a19] dark:text-white">
              {provider.description ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Propriété</h3>
        <p className="mt-3 text-[#010a19] dark:text-white">
          {provider.organizationId === null ? (
            "Prestataire plateforme"
          ) : (
            <>
              Ajouté par :{" "}
              <span className="font-medium">
                {provider.organizationName ?? provider.organizationId}
              </span>
            </>
          )}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Visibilité</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Utilisé par</dt>
            <dd className="font-medium text-[#010a19] dark:text-white">
              {visibility.landlordCount} organisation
              {visibility.landlordCount === 1 ? "" : "s"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Affecté à</dt>
            <dd className="font-medium text-[#010a19] dark:text-white">
              {visibility.propertyCount} bien{visibility.propertyCount === 1 ? "" : "s"}
            </dd>
          </div>
        </dl>
      </section>

      <AdminServiceProviderDetailActions provider={provider} />
    </div>
  );
}
