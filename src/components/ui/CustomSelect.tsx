import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  /** "sm" pour usage inline compact (dans les tableaux, formulaires petits) */
  size?: "sm" | "md";
}

export const CustomSelect = ({
  value,
  options,
  placeholder = "— Sélectionner —",
  disabled,
  onChange,
  size = "md",
}: CustomSelectProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const isSm = size === "sm";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 border border-border bg-muted/40 text-foreground rounded-xl disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring/20 transition ${
          isSm ? "px-2.5 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
        }`}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={isSm ? 12 : 14}
          className={`text-muted-foreground shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[8rem] bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 text-left hover:bg-muted/60 transition-colors ${
                  isSm ? "px-2.5 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
                }`}
              >
                <span className={value === opt.value ? "text-foreground font-medium" : "text-foreground"}>
                  {opt.label}
                </span>
                {value === opt.value && (
                  <Check size={isSm ? 11 : 13} className="text-foreground shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
