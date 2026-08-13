import Link from "next/link";
import { createMarketplaceRepo } from "../../api/shared";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Envoyée",
  under_review: "En revue",
  approved: "Approuvée",
  rejected: "Refusée",
  needs_more_info: "Infos demandées",
  converted: "Convertie"
};

export default async function AccountApplicationsPage(): Promise<React.ReactElement> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return <p className="text-sm text-slate-600">Connectez-vous pour voir vos candidatures.</p>;
  }

  const items = await createMarketplaceRepo().listApplicationsForUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-900">Mes candidatures</h2>
        <p className="mt-1 text-sm text-slate-600">
          {items.length} candidature{items.length > 1 ? "s" : ""}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-800">Aucune candidature</p>
          <Link href="/marketplace" className="mt-4 inline-flex text-sm font-bold text-[#0063FE]">
            Trouver un logement →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.applicationId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">
                    {item.listing?.title ?? "Annonce indisponible"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.listing?.locationLabel ?? "—"} ·{" "}
                    {new Date(item.createdAtIso).toLocaleDateString("fr-FR")}
                  </p>
                  {!item.available ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                      Plus disponible
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {STATUS_LABELS[item.status] ?? item.status}
                </span>
              </div>
              {item.listing ? (
                <Link href={item.listing.sharePath} className="mt-3 inline-flex text-sm font-semibold text-[#0063FE]">
                  Voir l&apos;annonce →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
