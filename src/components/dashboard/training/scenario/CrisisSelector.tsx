import { AlertTriangle, UserX, TrendingUp, Frown, Clock, Swords } from "lucide-react";
import type { CrisisType } from "@/lib/training-types";

const CRISES: {
  type: CrisisType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    type: "intervenant_decroche",
    label: "Intervenant décroche",
    description: "L'intervenant en charge de l'étude ne répond plus et manque des jalons.",
    icon: <UserX size={18} />,
    color: "text-red-500 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
  },
  {
    type: "scope_creep",
    label: "Scope creep",
    description: "Le client demande des livrables supplémentaires non prévus dans le CE.",
    icon: <TrendingUp size={18} />,
    color: "text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20",
  },
  {
    type: "client_mecontent",
    label: "Client mécontent",
    description: "Le client exprime sa vive insatisfaction sur la qualité du livrable intermédiaire.",
    icon: <Frown size={18} />,
    color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
  },
  {
    type: "retard_phase",
    label: "Retard de phase",
    description: "Une phase clé est en retard significatif sur le planning initial.",
    icon: <Clock size={18} />,
    color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
  },
  {
    type: "conflit_contact",
    label: "Conflit avec le contact",
    description: "Un désaccord sur les conditions de la mission génère des tensions avec le contact client.",
    icon: <Swords size={18} />,
    color: "text-purple-500 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20",
  },
];

interface Props {
  selected: CrisisType | null;
  onSelect: (type: CrisisType) => void;
}

export default function CrisisSelector({ selected, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={15} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Choisissez un type de crise</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CRISES.map((crisis) => (
          <button
            key={crisis.type}
            onClick={() => onSelect(crisis.type)}
            className={`
              rounded-xl border p-4 text-left transition-all duration-150 space-y-2
              ${selected === crisis.type ? crisis.color + " ring-2 ring-offset-1 ring-current/30" : "bg-card border-border hover:bg-muted/40"}
            `}
          >
            <div className={`${selected === crisis.type ? "" : "text-muted-foreground"}`}>
              {crisis.icon}
            </div>
            <p className={`text-sm font-medium ${selected === crisis.type ? "" : "text-foreground"}`}>
              {crisis.label}
            </p>
            <p className={`text-xs ${selected === crisis.type ? "opacity-80" : "text-muted-foreground"}`}>
              {crisis.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
