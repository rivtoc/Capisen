import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";

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

const emptyForm: ContactForm = {
  full_name: "",
  company: null,
  job_title: null,
  email: null,
  linkedin_url: null,
  notes: null,
};

const MailContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fields: { key: keyof ContactForm; label: string; placeholder: string }[] = [
    { key: "full_name", label: "Nom complet *", placeholder: "Jean Dupont" },
    { key: "company", label: "Entreprise", placeholder: "Acme Corp" },
    { key: "job_title", label: "Poste", placeholder: "Directeur Commercial" },
    { key: "email", label: "Email", placeholder: "jean@acme.fr" },
    { key: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/in/…" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Contacts</h2>
          <p className="text-sm text-muted-foreground">Gérez vos contacts prospects et clients.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          Nouveau contact
        </button>
      </div>

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

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-white border border-gray-200 rounded-2xl">
          <p className="text-sm">Aucun contact pour l'instant. Ajoutez-en un !</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
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
              {contacts.map((c) => (
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MailContacts;
