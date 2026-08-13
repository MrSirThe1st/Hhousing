import Link from "next/link";
import { createMarketplaceRepo } from "../../api/shared";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export default async function AccountRequestsPage(): Promise<React.ReactElement> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return <p className="text-sm text-slate-600">Connectez-vous pour voir vos demandes.</p>;
  }

  const items = await createMarketplaceRepo().listViewingRequestsForUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-900">Mes demandes</h2>
        <p className="mt-1 text-sm text-slate-600">Demandes de visite liées à votre compte.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-800">Aucune demande de visite</p>
          <p className="mt-1 text-sm text-slate-500">
            Les demandes de visite apparaîtront ici une fois disponibles depuis les annonces.
          </p>
          <Link href="/marketplace" className="mt-4 inline-flex text-sm font-bold text-[#0063FE]">
            Parcourir le catalogue →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-bold text-slate-900">
                {item.listing?.title ?? "Annonce indisponible"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {new Date(item.request.createdAtIso).toLocaleDateString("fr-FR")} · {item.request.status}
              </p>
              {!item.available ? (
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Plus disponible
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
