import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { POLE_OPTIONS, type PoleType, type MemberRole } from "@/lib/db-types";

interface Member {
  id: string;
  full_name: string;
  role: MemberRole;
  avatar_url: string | null;
}

const ROLE_LABELS: Record<MemberRole, string> = {
  normal: "Membre",
  responsable: "Responsable",
  presidence: "Présidence",
};

const ROLE_COLORS: Record<MemberRole, string> = {
  normal: "bg-gray-100 text-gray-600",
  responsable: "bg-blue-50 text-blue-700",
  presidence: "bg-black text-white",
};

// Formations fictives (front uniquement — à relier au module formation plus tard)
const MOCK_FORMATIONS = [
  { title: "Onboarding Capisen", completed: true, progress: 100 },
  { title: "Gestion de projet", completed: false, progress: 60 },
  { title: "Communication client", completed: false, progress: 0 },
];

interface Props {
  pole: PoleType;
}

const SupervisionPole = ({ pole }: Props) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const poleLabel = POLE_OPTIONS.find((p) => p.value === pole)?.label ?? pole;

  useEffect(() => {
    setLoading(true);
    supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url")
      .eq("pole", pole)
      .order("full_name")
      .then(({ data }) => {
        setMembers((data as Member[]) ?? []);
        setLoading(false);
      });
  }, [pole]);

  const globalProgress = (formations: typeof MOCK_FORMATIONS) => {
    if (formations.length === 0) return 0;
    return Math.round(formations.reduce((acc, f) => acc + f.progress, 0) / formations.length);
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">
          Supervision — {poleLabel}
        </h2>
        <p className="text-sm text-muted-foreground">
          Vue d'ensemble des membres et de leur progression.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-white border border-gray-200 rounded-2xl">
          <p className="text-sm">Aucun membre dans ce pôle pour l'instant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            // Pour l'instant, formations fictives — sera remplacé par les vraies données
            const formations = MOCK_FORMATIONS;
            const progress = globalProgress(formations);
            const completed = formations.filter((f) => f.completed).length;

            return (
              <div
                key={member.id}
                className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4"
              >
                {/* En-tête membre */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-gray-500 uppercase">
                        {member.full_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {member.full_name}
                    </p>
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${ROLE_COLORS[member.role]}`}
                    >
                      {ROLE_LABELS[member.role]}
                    </span>
                  </div>
                </div>

                {/* Formations */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-foreground">Formations</p>
                    <span className="text-xs text-muted-foreground">
                      {completed}/{formations.length} terminée{formations.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {formations.map((f, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground truncate pr-2">
                            {f.title}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {f.progress}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              f.completed ? "bg-green-500" : f.progress > 0 ? "bg-black" : "bg-gray-200"
                            }`}
                            style={{ width: `${f.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progression globale */}
                <div className="pt-1 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-foreground">Progression globale</span>
                    <span className="text-xs font-semibold text-foreground">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-black rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note front-only */}
      <p className="mt-6 text-xs text-muted-foreground text-center">
        Les données de formation sont simulées — elles seront connectées au module formations.
      </p>
    </div>
  );
};

export default SupervisionPole;
