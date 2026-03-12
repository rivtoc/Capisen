/**
 * Classes Tailwind partagées — centralisées pour cohérence dark/light mode.
 * Importer ce fichier dans les composants plutôt que de dupliquer les classes.
 */

export const btn = {
  /** Bouton principal (noir en light, blanc en dark) */
  primary:
    "flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-semibold rounded-xl hover:bg-foreground/90 disabled:opacity-50 transition-colors",
  /** Bouton secondaire avec bordure */
  secondary:
    "px-4 py-2 text-sm border border-border rounded-xl hover:bg-muted/40 text-foreground transition-colors",
  /** Bouton icône neutre */
  icon: "p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
  /** Bouton icône actif (ex: édition en cours) */
  iconActive: "p-1.5 rounded-lg bg-foreground/10 text-foreground transition-colors",
  /** Bouton icône destructif */
  iconDanger:
    "p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors",
};

export const field = {
  /** Input texte standard */
  input:
    "w-full px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition",
  /** Textarea standard */
  textarea:
    "w-full px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition resize-none",
  /** Select standard (même style que input) */
  select:
    "w-full px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-foreground appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition",
  /** Barre de recherche avec icône à gauche (pl-9) */
  search:
    "w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20",
  /** Conteneur de champ avec focus-within (ex: recherche inline) */
  focusWrapper:
    "flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-muted/40 focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-ring transition",
};
