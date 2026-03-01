import { FileDown, AlertCircle } from "lucide-react";

const MOCK_HISTORY = [
  { ref: "CAP-2025-041", client: "TechVision SAS", docs: ["Convention", "Devis", "Bon de commande"], date: "12 fév. 2025", status: "Complet" },
  { ref: "CAP-2025-038", client: "BioNord Industries", docs: ["Convention", "Rapport"], date: "28 jan. 2025", status: "Partiel" },
  { ref: "CAP-2025-031", client: "Agence Lumi", docs: ["Convention", "Devis", "Facture"], date: "9 jan. 2025", status: "Complet" },
];

const EtudesHistorique = () => {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">Historique des documents</h2>
        <p className="text-sm text-muted-foreground">
          Archives des documents générés pour chaque étude.
        </p>
      </div>

      {/* Bandeau en développement */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 mb-8">
        <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Données simulées</p>
          <p className="text-sm text-amber-700 mt-0.5">
            L'historique ci-dessous est un aperçu de l'interface finale — les vraies données seront chargées lors de l'intégration.
          </p>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-foreground">Référence</th>
              <th className="text-left px-5 py-3 font-medium text-foreground">Client</th>
              <th className="text-left px-5 py-3 font-medium text-foreground">Documents</th>
              <th className="text-left px-5 py-3 font-medium text-foreground">Date</th>
              <th className="text-left px-5 py-3 font-medium text-foreground">Statut</th>
              <th className="px-5 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MOCK_HISTORY.map((item) => (
              <tr key={item.ref} className="hover:bg-gray-50 transition-colors opacity-60">
                <td className="px-5 py-3 font-mono text-xs font-medium text-foreground">
                  {item.ref}
                </td>
                <td className="px-5 py-3 text-foreground">{item.client}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.docs.map((d) => (
                      <span
                        key={d}
                        className="text-xs bg-gray-100 text-muted-foreground px-2 py-0.5 rounded-full"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground text-xs">{item.date}</td>
                <td className="px-5 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.status === "Complet"
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button
                    disabled
                    title="Téléchargement disponible après intégration"
                    className="p-1.5 rounded-lg text-muted-foreground cursor-not-allowed"
                  >
                    <FileDown size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EtudesHistorique;
