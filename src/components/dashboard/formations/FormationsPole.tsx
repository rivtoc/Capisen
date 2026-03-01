import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, BookOpen, ChevronRight, Layers } from "lucide-react";
import type { PoleType } from "@/lib/db-types";
import { POLE_OPTIONS } from "@/lib/db-types";
import FormationForm from "./FormationForm";
import FormationDetail from "./FormationDetail";

interface Formation {
  id: string;
  title: string;
  description: string | null;
  pole: PoleType;
  created_by: string | null;
  created_at: string;
}

type View = "list" | "create" | "edit" | "detail";

const FormationsPole = ({ pole }: { pole: PoleType }) => {
  const { profile } = useAuth();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<Formation | null>(null);

  const isPresidence = profile?.role === "presidence";
  const isResponsableOfPole = profile?.role === "responsable" && profile?.pole === pole;
  const canManage = isPresidence || isResponsableOfPole;
  const poleLabel = POLE_OPTIONS.find((p) => p.value === pole)?.label ?? pole;

  const fetchFormations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("formations")
      .select("*")
      .eq("pole", pole)
      .order("created_at", { ascending: false });
    setFormations(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFormations();
    setView("list");
    setSelected(null);
  }, [pole]);

  if (view === "create" || view === "edit") {
    return (
      <FormationForm
        pole={pole}
        formation={view === "edit" ? selected : null}
        onBack={() => setView(view === "edit" && selected ? "detail" : "list")}
        onSaved={() => { fetchFormations(); setView("list"); setSelected(null); }}
      />
    );
  }

  if (view === "detail" && selected) {
    return (
      <FormationDetail
        formation={selected}
        canManage={canManage}
        onBack={() => { setSelected(null); setView("list"); }}
        onEdit={() => setView("edit")}
        onDeleted={() => { fetchFormations(); setSelected(null); setView("list"); }}
      />
    );
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Formations — {poleLabel}</h2>
          <p className="text-sm text-muted-foreground">
            Parcours de formation disponibles pour ce pôle.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setView("create")}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            Nouvelle formation
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : formations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-white border border-gray-200 rounded-2xl">
          <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-1">Aucune formation disponible pour ce pôle.</p>
          {canManage && (
            <button
              onClick={() => setView("create")}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
            >
              <Plus size={14} />
              Créer la première formation
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {formations.map((f) => (
            <div
              key={f.id}
              onClick={() => { setSelected(f); setView("detail"); }}
              className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3 cursor-pointer hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <BookOpen size={16} className="text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground leading-snug pt-1">{f.title}</h3>
              </div>
              {f.description && (
                <p className="text-xs text-muted-foreground line-clamp-3">{f.description}</p>
              )}
              <div className="mt-auto flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Layers size={12} />
                  Formation
                </span>
                <span className="text-xs font-medium text-foreground flex items-center gap-1">
                  Ouvrir <ChevronRight size={12} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormationsPole;
