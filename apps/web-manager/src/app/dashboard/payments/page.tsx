import { redirect } from "next/navigation";
import type { Payment } from "@hhousing/domain";
import { listPayments } from "../../../api";
import { createPaymentRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  overdue: "En retard",
  cancelled: "Annulé",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default async function PaymentsPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const result = await listPayments(
    { session, organizationId: session.organizationId ?? "", leaseId: null, status: null },
    { repository: createPaymentRepo() }
  );

  const payments: Payment[] = result.body.success ? result.body.data.payments : [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#010a19]">Paiements</h1>
        <button className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] transition-colors">
          + Enregistrer
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
          Aucun paiement pour l&apos;instant.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Échéance</th>
                <th className="px-4 py-3 text-left">Montant</th>
                <th className="px-4 py-3 text-left">Payé le</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{payment.dueDate}</td>
                  <td className="px-4 py-3 font-medium text-[#010a19]">
                    {payment.amount.toLocaleString("fr-FR")} {payment.currencyCode}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{payment.paidDate ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[payment.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABELS[payment.status] ?? payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{payment.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

