import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceProviderRepositoryFromEnv } from "@hhousing/data-access";
import AdminServiceProviderForm from "../../../../../components/admin-service-provider-form";

export default async function AdminEditServiceProviderPage({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const repo = createServiceProviderRepositoryFromEnv(process.env);
  const [provider, categories] = await Promise.all([
    repo.getProviderById(id),
    repo.listCategories()
  ]);

  if (!provider) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/service-providers/${provider.id}`}
          className="text-sm font-medium text-slate-500 hover:underline"
        >
          ← {provider.name}
        </Link>
        <h2 className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
          Modifier le prestataire
        </h2>
      </div>
      <AdminServiceProviderForm
        mode="edit"
        providerId={provider.id}
        categories={categories}
        initial={{
          name: provider.name,
          categoryId: provider.categoryId,
          phone: provider.phone,
          whatsappPhone: provider.whatsappPhone,
          description: provider.description,
          city: provider.city,
          quartier: provider.quartier,
          isVerified: provider.isVerified
        }}
      />
    </div>
  );
}
