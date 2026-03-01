import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Pencil, Trash2, X, Loader2, Upload, CheckCircle2, AlertCircle, Search } from "lucide-react";

// Supprime les accents et met en minuscules — sans regex complexe
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

interface Contact {
  id: string;
  full_name: string;
  company: string | null;
  job_title: string | null;
  email: string | null;
  linkedin_url: string | null;
  notes: string | null;
}

type ContactForm = Omit<Contact, "id">;

type ParsedContact = ContactForm;

interface ImportResult {
  imported: number;
  skipped: number;
}

const emptyForm: ContactForm = {
  full_name: "",
  company: null,
  job_title: null,
  email: null,
  linkedin_url: null,
  notes: null,
};

// Parseur CSV simple gérant les champs entre guillemets
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
}

function parseLinkedInCSV(text: string): ParsedContact[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");

  // LinkedIn peut avoir des lignes de métadonnées avant les headers — on cherche la ligne header
  const headerIdx = lines.findIndex((l) =>
    l.toLowerCase().includes("first name") || l.toLowerCase().includes("firstname")
  );
  if (headerIdx === -1) return [];

  const headers = parseCSVLine(lines[headerIdx]).map((h) => h.replace(/^"|"$/g, "").toLowerCase());

  const idx = {
    firstName: headers.findIndex((h) => h.includes("first name") || h === "firstname"),
    lastName: headers.findIndex((h) => h.includes("last name") || h === "lastname"),
    url: headers.findIndex((h) => h === "url" || h.includes("linkedin")),
    email: headers.findIndex((h) => h.includes("email")),
    company: headers.findIndex((h) => h.includes("company")),
    position: headers.findIndex((h) => h.includes("position") || h.includes("title")),
  };

  const contacts: ParsedContact[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]).map((c) => c.replace(/^"|"$/g, "").trim());
    const firstName = idx.firstName >= 0 ? cols[idx.firstName] ?? "" : "";
    const lastName = idx.lastName >= 0 ? cols[idx.lastName] ?? "" : "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    if (!fullName) continue;

    contacts.push({
      full_name: fullName,
      email: idx.email >= 0 && cols[idx.email] ? cols[idx.email] : null,
      company: idx.company >= 0 && cols[idx.company] ? cols[idx.company] : null,
      job_title: idx.position >= 0 && cols[idx.position] ? cols[idx.position] : null,
      linkedin_url: idx.url >= 0 && cols[idx.url] ? cols[idx.url] : null,
      notes: null,
    });
  }

  return contacts;
}

const MailContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Import CSV
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const fetchContacts = async () => {
    const { data } = await supabase.from("contacts").select("*").order("full_name");
    setContacts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchContacts(); }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (c: Contact) => {
    setForm({
      full_name: c.full_name,
      company: c.company,
      job_title: c.job_title,
      email: c.email,
      linkedin_url: c.linkedin_url,
      notes: c.notes,
    });
    setEditId(c.id);
    setError(null);
    setShowForm(true);
  };

  const setField = (key: keyof ContactForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value || null }));
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { setError("Le nom est requis."); return; }
    setSaving(true);
    const payload = { ...form, full_name: form.full_name.trim() };
    if (editId) {
      const { error: e } = await supabase.from("contacts").update(payload).eq("id", editId);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { error: e } = await supabase.from("contacts").insert(payload);
      if (e) { setError(e.message); setSaving(false); return; }
    }
    await fetchContacts();
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce contact ?")) return;
    await supabase.from("contacts").delete().eq("id", id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // --- Import CSV ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseLinkedInCSV(text);
      if (parsed.length === 0) {
        setParseError("Aucun contact trouvé. Vérifie que le fichier est bien un export LinkedIn (Connections).");
      } else {
        setParsedContacts(parsed);
      }
    };
    reader.readAsText(file, "UTF-8");
    // Reset l'input pour permettre de re-sélectionner le même fichier
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!parsedContacts) return;
    setImporting(true);

    // On insère par batch de 50
    let imported = 0;
    let skipped = 0;
    const chunks = [];
    for (let i = 0; i < parsedContacts.length; i += 50) {
      chunks.push(parsedContacts.slice(i, i + 50));
    }

    for (const chunk of chunks) {
      const { error: e, data } = await supabase.from("contacts").insert(chunk).select();
      if (e) {
        skipped += chunk.length;
      } else {
        imported += data?.length ?? 0;
      }
    }

    await fetchContacts();
    setImportResult({ imported, skipped });
    setParsedContacts(null);
    setImporting(false);
  };

  const cancelImport = () => {
    setParsedContacts(null);
    setParseError(null);
    setImportResult(null);
  };

  // Recherche multi-champs (nom, entreprise, poste) — par mots, sans regex complexe
  const searchTokens = normalize(search).split(" ").filter(Boolean);
  const filtered = contacts.filter((c) => {
    if (searchTokens.length === 0) return true;
    const haystack = normalize(
      [c.full_name, c.company, c.job_title].filter(Boolean).join(" ")
    );
    return searchTokens.every((token) => haystack.includes(token));
  });

  const fields: { key: keyof ContactForm; label: string; placeholder: string }[] = [
    { key: "full_name", label: "Nom complet *", placeholder: "Jean Dupont" },
    { key: "company", label: "Entreprise", placeholder: "Acme Corp" },
    { key: "job_title", label: "Poste", placeholder: "Directeur Commercial" },
    { key: "email", label: "Email", placeholder: "jean@acme.fr" },
    { key: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/in/…" },
  ];

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Contacts</h2>
          <p className="text-sm text-muted-foreground">Gérez vos contacts prospects et clients.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Upload size={16} />
            Importer LinkedIn CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            Nouveau contact
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Nom, prénom, entreprise, poste…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Erreur de parsing */}
      {parseError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 mb-6">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">Fichier non reconnu</p>
            <p className="text-sm text-red-600 mt-0.5">{parseError}</p>
          </div>
          <button onClick={cancelImport}><X size={16} className="text-red-400 hover:text-red-600" /></button>
        </div>
      )}

      {/* Résultat import */}
      {importResult && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-2xl px-5 py-4 mb-6">
          <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700">Import terminé</p>
            <p className="text-sm text-green-600 mt-0.5">
              {importResult.imported} contact{importResult.imported !== 1 ? "s" : ""} importé{importResult.imported !== 1 ? "s" : ""}
              {importResult.skipped > 0 && `, ${importResult.skipped} ignoré${importResult.skipped !== 1 ? "s" : ""}`}.
            </p>
          </div>
          <button onClick={cancelImport}><X size={16} className="text-green-400 hover:text-green-600" /></button>
        </div>
      )}

      {/* Aperçu avant import */}
      {parsedContacts && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {parsedContacts.length} contact{parsedContacts.length !== 1 ? "s" : ""} détecté{parsedContacts.length !== 1 ? "s" : ""}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Vérifiez avant d'importer.</p>
            </div>
            <button onClick={cancelImport}>
              <X size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          </div>

          {/* Aperçu des 5 premiers */}
          <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-foreground">Nom</th>
                  <th className="text-left px-3 py-2 font-medium text-foreground">Entreprise</th>
                  <th className="text-left px-3 py-2 font-medium text-foreground">Poste</th>
                  <th className="text-left px-3 py-2 font-medium text-foreground">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parsedContacts.slice(0, 5).map((c, i) => (
                  <tr key={i} className="bg-white">
                    <td className="px-3 py-2 font-medium text-foreground">{c.full_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.company ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.job_title ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedContacts.length > 5 && (
              <p className="text-xs text-center text-muted-foreground py-2 bg-gray-50 border-t border-gray-100">
                … et {parsedContacts.length - 5} autre{parsedContacts.length - 5 !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {importing && <Loader2 size={14} className="animate-spin" />}
              {importing ? "Import en cours…" : `Importer ${parsedContacts.length} contact${parsedContacts.length !== 1 ? "s" : ""}`}
            </button>
            <button
              onClick={cancelImport}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Formulaire ajout/édition manuel */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {editId ? "Modifier le contact" : "Nouveau contact"}
            </h3>
            <button onClick={() => setShowForm(false)}>
              <X size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(({ key, label, placeholder }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">{label}</label>
                <input
                  type="text"
                  value={(form[key] as string) ?? ""}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 mt-4">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Informations complémentaires…"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition resize-none"
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editId ? "Enregistrer" : "Ajouter"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des contacts */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-white border border-gray-200 rounded-2xl">
          <p className="text-sm">Aucun contact pour l'instant. Ajoutez-en un ou importez depuis LinkedIn.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Nom</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Entreprise</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Poste</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Email</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Aucun contact ne correspond à « {search} ».
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{c.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.company ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.job_title ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {search
              ? `${filtered.length} résultat${filtered.length !== 1 ? "s" : ""} sur ${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`
              : `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`}
          </p>
        </>
      )}
    </div>
  );
};

export default MailContacts;
