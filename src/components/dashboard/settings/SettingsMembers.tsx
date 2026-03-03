import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { POLE_OPTIONS, MEMBER_ROLES, type PoleType, type MemberRole } from "@/lib/db-types";
import { Check, Loader2, Search } from "lucide-react";

interface Member {
  id: string;
  full_name: string;
  pole: PoleType;
  role: MemberRole;
}

interface EditState {
  pole: PoleType;
  role: MemberRole;
}

const ROLE_LABELS: Record<MemberRole, string> = {
  normal: "Membre",
  responsable: "Responsable",
  presidence: "Présidence",
};

const SettingsMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, pole, role")
      .order("full_name")
      .then(({ data }) => {
        setMembers((data as Member[]) ?? []);
        setLoading(false);
      });
  }, []);

  const getEdit = (member: Member): EditState =>
    edits[member.id] ?? { pole: member.pole, role: member.role };

  const setEdit = (id: string, field: keyof EditState, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), ...getEdit(members.find((m) => m.id === id)!), [field]: value },
    }));
  };

  const isDirty = (member: Member) => {
    const e = edits[member.id];
    if (!e) return false;
    return e.pole !== member.pole || e.role !== member.role;
  };

  const handleSave = async (member: Member) => {
    const e = edits[member.id];
    if (!e) return;
    setSaving((prev) => ({ ...prev, [member.id]: true }));

    const { error } = await supabase
      .from("profiles")
      .update({ pole: e.pole, role: e.role })
      .eq("id", member.id);

    setSaving((prev) => ({ ...prev, [member.id]: false }));

    if (!error) {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, pole: e.pole, role: e.role } : m))
      );
      setEdits((prev) => {
        const next = { ...prev };
        delete next[member.id];
        return next;
      });
      setSaved((prev) => ({ ...prev, [member.id]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [member.id]: false })), 2000);
    }
  };

  const filtered = members.filter((m) =>
    m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">Gestion des membres</h2>
        <p className="text-sm text-muted-foreground">
          Modifiez le rôle et le pôle de chaque membre.
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="relative mb-5 max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un membre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-foreground">Membre</th>
                <th className="text-left px-5 py-3 font-medium text-foreground">Pôle</th>
                <th className="text-left px-5 py-3 font-medium text-foreground">Rôle</th>
                <th className="px-5 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground text-sm">
                    Aucun membre trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((member) => {
                  const edit = getEdit(member);
                  const dirty = isDirty(member);
                  const isSaving = saving[member.id];
                  const isSaved = saved[member.id];

                  return (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-gray-500 uppercase">
                              {member.full_name.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">{member.full_name}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <select
                          value={edit.pole}
                          onChange={(e) => setEdit(member.id, "pole", e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer"
                        >
                          {POLE_OPTIONS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-5 py-3">
                        <select
                          value={edit.role}
                          onChange={(e) => setEdit(member.id, "role", e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer"
                        >
                          {MEMBER_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-5 py-3">
                        {isSaved ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <Check size={13} />
                            Sauvegardé
                          </span>
                        ) : dirty ? (
                          <button
                            onClick={() => handleSave(member)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : null}
                            Enregistrer
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        {filtered.length} membre{filtered.length !== 1 ? "s" : ""}
        {search ? ` trouvé${filtered.length !== 1 ? "s" : ""}` : " au total"}
      </p>
    </div>
  );
};

export default SettingsMembers;
