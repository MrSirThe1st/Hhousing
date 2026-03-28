export default function PaymentsPage(): React.ReactElement {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#010a19]">Paiements</h1>
        <button className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] transition-colors">
          + Enregistrer
        </button>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
        Aucun paiement pour l&apos;instant.
      </div>
    </div>
  );
}
