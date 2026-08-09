import Link from "next/link";
import { createServiceProviderRepositoryFromEnv } from "@hhousing/data-access";
import AdminServiceProviderForm from "../../../../components/admin-service-provider-form";

export default async function AdminNewServiceProviderPage(): Promise<React.ReactElement> {
  const repo = createServiceProviderRepositoryFromEnv(process.env);
  const categories = await repo.listCategories();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/service-providers"
          className="text-sm font-medium text-slate-500 hover:underline"
        >
          ← Artisans et services
        </Link>
        <h2 className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
          Ajouter un prestataire
        </h2>
        <p className="mt-1 text-sm text-slate-500">Créer un prestataire plateforme</p>
      </div>
      <AdminServiceProviderForm mode="create" categories={categories} />
    </div>
  );
}
