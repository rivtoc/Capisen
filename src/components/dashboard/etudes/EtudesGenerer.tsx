import { FileText, Upload, Folder, AlertCircle } from "lucide-react";

const DOCUMENT_TYPES = [
  { id: "convention", label: "Convention d'étude", description: "Document contractuel entre Capisen et le client." },
  { id: "devis", label: "Devis", description: "Estimation financière de la prestation." },
  { id: "bon_commande", label: "Bon de commande", description: "Validation formelle de la commande." },
  { id: "rapport", label: "Rapport de mission", description: "Compte-rendu final de l'étude." },
  { id: "facture", label: "Facture", description: "Document de facturation client." },
];

const EtudesGenerer = () => {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">Générer les documents</h2>
        <p className="text-sm text-muted-foreground">
          Génération automatique des documents relatifs à une étude via l'outil Python Capisen.
        </p>
      </div>

      {/* Bandeau en développement */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 mb-8">
        <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Module en cours d'intégration</p>
          <p className="text-sm text-amber-700 mt-0.5">
            L'outil Python est développé — la connexion avec cette interface est en cours.
          </p>
        </div>
      </div>

      {/* Formulaire (front uniquement) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Informations de l'étude</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Nom de l'étude</label>
            <input
              type="text"
              disabled
              placeholder="Ex : Étude MarketPro 2025"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Référence</label>
            <input
              type="text"
              disabled
              placeholder="Ex : CAP-2025-042"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Client</label>
            <input
              type="text"
              disabled
              placeholder="Nom de l'entreprise cliente"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Interlocuteur</label>
            <input
              type="text"
              disabled
              placeholder="Prénom Nom"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>

        {/* Sélection des documents */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-3">
            Documents à générer
          </label>
          <div className="space-y-2">
            {DOCUMENT_TYPES.map((doc) => (
              <label
                key={doc.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
              >
                <input type="checkbox" disabled className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.label}</p>
                  <p className="text-xs text-muted-foreground">{doc.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Zone d'upload */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">
            Pièces jointes <span className="text-muted-foreground font-normal">(optionnel)</span>
          </label>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center opacity-60 cursor-not-allowed">
            <Upload size={20} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Glissez vos fichiers ici</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel — max 10 Mo</p>
          </div>
        </div>

        <button
          disabled
          className="w-full flex items-center justify-center gap-2 py-3 bg-black text-white text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed"
        >
          <FileText size={16} />
          Générer les documents
        </button>
      </div>

      {/* Aperçu des fichiers générés */}
      <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Folder size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Fichiers générés</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Les documents générés apparaîtront ici.</p>
        </div>
      </div>
    </div>
  );
};

export default EtudesGenerer;
