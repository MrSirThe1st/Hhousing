import Link from "next/link";
import { createServiceProviderRepositoryFromEnv } from "@hhousing/data-access";
import AdminServiceProviderRowActions from "../../../components/admin-service-provider-row-actions";

type ViewFilter = "all" | "verified" | "landlord" | "suspended";

function parseView(value: string | undefined): ViewFilter {
  if (value === "verified" || value === "landlord" || value === "suspended") {
    return value;
  }
  return "all";
}

function verificationLabel(isVerified: boolean): string {
  return isVerified ? "Vérifié" : "Non vérifié";
}

function verificationClass(isVerified: boolean): string {
  return isVerified
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

export default async function AdminServiceProvidersPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string; categoryId?: string; search?: string }>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const view = parseView(params.view);
  const categoryId = params.categoryId || undefined;
  const search = params.search?.trim() || undefined;

  const repo = createServiceProviderRepositoryFromEnv(process.env);
  const [categories, providers] = await Promise.all([
    repo.listCategories(),
    repo.listProviders({
      categoryId,
      search,
      status: view === "suspended" ? "suspended" : undefined,
      verifiedOnly: view === "verified" ? true : undefined,
      landlordOnly: view === "landlord" ? true : undefined
    })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#010a19] dark:text-white">Artisans et services</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Catalogue plateforme et prestataires ajoutés par les gestionnaires
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/service-providers/categories"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Catégories
          </Link>
          <Link
            href="/admin/service-providers/new"
            className="rounded-lg bg-[#010a19] px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-[#010a19]"
          >
            + Ajouter un prestataire
          </Link>
        </div>
      </div>

      <form className="flex flex-col gap-3 lg:flex-row" method="get">
        <input
          type="search"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Rechercher nom ou téléphone…"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#0d1526] dark:text-white lg:min-w-64"
        />
        <select
          name="categoryId"
          defaultValue={categoryId ?? ""}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          name="view"
          defaultValue={view}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
        >
          <option value="all">Tous</option>
          <option value="verified">Vérifiés</option>
          <option value="landlord">Ajoutés par gestionnaires</option>
          <option value="suspended">Suspendus</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
        >
          Filtrer
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d1526]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Prestataire</th>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {providers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Aucun prestataire trouvé.
                </td>
              </tr>
            ) : (
              providers.map((provider) => (
                <tr key={provider.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/service-providers/${provider.id}`}
                      className="font-medium text-[#010a19] hover:underline dark:text-white"
                    >
                      {provider.name}
                    </Link>
                    {provider.status === "suspended" ? (
                      <p className="mt-1 text-xs font-medium text-red-600">Suspendu</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {provider.categoryName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{provider.phone}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {provider.organizationId === null ? (
                      "Plateforme"
                    ) : (
                      <>
                        Gestionnaire
                        {provider.organizationName ? (
                          <span className="mt-0.5 block text-xs text-slate-400">
                            {provider.organizationName}
                          </span>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${verificationClass(provider.isVerified)}`}
                    >
                      {verificationLabel(provider.isVerified)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <AdminServiceProviderRowActions provider={provider} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
