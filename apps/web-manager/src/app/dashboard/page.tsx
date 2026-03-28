export default function DashboardPage(): React.ReactElement {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#010a19] mb-6">Vue d&apos;ensemble</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Propriétés", value: "—" },
          { label: "Locataires actifs", value: "—" },
          { label: "Loyers en attente", value: "—" },
          { label: "Baux actifs", value: "—" },
          { label: "Paiements ce mois", value: "—" },
          { label: "Demandes en cours", value: "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-semibold text-[#010a19]">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
