import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { POLE_OPTIONS, MEMBER_ROLES, type PoleType, type MemberRole } from "@/lib/db-types";
import { FEATURES, FEATURE_LABELS, type Feature } from "@/lib/permissions";
import { field, btn } from "@/lib/ui-classes";
import { Check, Loader2, Search } from "lucide-react";

interface Member {
  id: string;
  full_name: string;
  pole: PoleType;
  role: MemberRole;
  permissions: string[] | null;
}

interface EditState {
  pole: PoleType;
  role: MemberRole;
  permissions: string[];
}

const ROLE_LABELS: Record<MemberRole, string> = {
  apprenti:    "Apprenti",
  normal:      "Membre",
  responsable: "Responsable",
  presidence:  "Présidence",
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
      .select("id, full_name, pole, role, permissions")
      .order("full_name")
      .then(({ data, error }) => {
        if (error) {
          // La colonne permissions n'existe pas encore → requête sans elle
          supabase
            .from("profiles")
            .select("id, full_name, pole, role")
            .order("full_name")
            .then(({ data: fallbackData }) => {
              setMembers((fallbackData as Member[]) ?? []);
              setLoading(false);
            });
        } else {
          setMembers((data as Member[]) ?? []);
          setLoading(false);
        }
      });
  }, []);

  const getEdit = (member: Member): EditState =>
    edits[member.id] ?? {
      pole: member.pole,
      role: member.role,
      permissions: member.permissions ?? [],
    };

  const setEditField = (id: string, field: keyof EditState, value: string) => {
    const member = members.find((m) => m.id === id)!;
    setEdits((prev) => ({
      ...prev,
      [id]: { ...getEdit(member), [field]: value },
    }));
  };

  const togglePermission = (id: string, feature: Feature) => {
    const member = members.find((m) => m.id === id)!;
    const current = getEdit(member).permissions;
    const next = current.includes(feature)
      ? current.filter((p) => p !== feature)
      : [...current, feature];
    setEdits((prev) => ({
      ...prev,
      [id]: { ...getEdit(member), permissions: next },
    }));
  };

  const isDirty = (member: Member) => {
    const e = edits[member.id];
    if (!e) return false;
    if (e.pole !== member.pole || e.role !== member.role) return true;
    const base = (member.permissions ?? []).slice().sort().join(",");
    const edited = e.permissions.slice().sort().join(",");
    return base !== edited;
  };

  const handleSave = async (member: Member) => {
    const e = edits[member.id];
    if (!e) return;
    setSaving((prev) => ({ ...prev, [member.id]: true }));

    const { error } = await supabase
      .from("profiles")
      .update({ pole: e.pole, role: e.role, permissions: e.permissions })
      .eq("id", member.id);

    setSaving((prev) => ({ ...prev, [member.id]: false }));

    if (!error) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id
            ? { ...m, pole: e.pole, role: e.role, permissions: e.permissions }
            : m
        )
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
          Modifiez le rôle, le pôle et les accès de chaque membre.
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="relative mb-5 max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher un membre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={field.search}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-foreground">Membre</th>
                <th className="text-left px-5 py-3 font-medium text-foreground">Pôle</th>
                <th className="text-left px-5 py-3 font-medium text-foreground">Rôle</th>
                <th className="text-left px-5 py-3 font-medium text-foreground">
                  Accès supplémentaires
                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(en plus du rôle)</span>
                </th>
                <th className="px-5 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">
                    Aucun membre trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((member) => {
                  const edit = getEdit(member);
                  const dirty = isDirty(member);
                  const isSaving = saving[member.id];
                  const isSaved = saved[member.id];
                  const isPresidence = edit.role === "presidence";

                  return (
                    <tr key={member.id} className="hover:bg-muted/40 transition-colors">
                      {/* Membre */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-muted-foreground uppercase">
                              {member.full_name.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">{member.full_name}</span>
                        </div>
                      </td>

                      {/* Pôle */}
                      <td className="px-5 py-3">
                        <select
                          value={edit.pole}
                          onChange={(e) => setEditField(member.id, "pole", e.target.value)}
                          className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 cursor-pointer"
                        >
                          {POLE_OPTIONS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Rôle */}
                      <td className="px-5 py-3">
                        <select
                          value={edit.role}
                          onChange={(e) => setEditField(member.id, "role", e.target.value)}
                          className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 cursor-pointer"
                        >
                          {MEMBER_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Permissions */}
                      <td className="px-5 py-3">
                        {isPresidence ? (
                          <span className="text-xs text-muted-foreground italic">Accès total</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {FEATURES.map((f) => {
                              const active = edit.permissions.includes(f);
                              return (
                                <button
                                  key={f}
                                  type="button"
                                  onClick={() => togglePermission(member.id, f)}
                                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                                    active
                                      ? "bg-foreground text-background border-foreground"
                                      : "bg-card text-muted-foreground border-border hover:border-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {FEATURE_LABELS[f]}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3 text-right">
                        {isSaved ? (
                          <span className="flex items-center justify-end gap-1 text-xs text-green-600 font-medium">
                            <Check size={13} />
                            Sauvegardé
                          </span>
                        ) : dirty ? (
                          <button
                            onClick={() => handleSave(member)}
                            disabled={isSaving}
                            className={btn.primary}
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
