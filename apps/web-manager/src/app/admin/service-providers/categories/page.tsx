import Link from "next/link";
import { createServiceProviderRepositoryFromEnv } from "@hhousing/data-access";
import AdminServiceProviderCategoriesPageClient from "../../../../components/admin-service-provider-categories-page-client";

export default async function AdminServiceProviderCategoriesPage(): Promise<React.ReactElement> {
  const repo = createServiceProviderRepositoryFromEnv(process.env);
  const categories = await repo.listCategoriesWithCounts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/service-providers"
            className="text-sm font-medium text-slate-500 hover:underline"
          >
            ← Artisans et services
          </Link>
          <h2 className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">Catégories</h2>
          <p className="mt-1 text-sm text-slate-500">Organiser les types de prestataires</p>
        </div>
      </div>

      <AdminServiceProviderCategoriesPageClient categories={categories} />
    </div>
  );
}
