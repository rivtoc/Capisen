import { Globe, BarChart3, Cog, Lightbulb } from "lucide-react";

const services = [
  {
    icon: Globe,
    title: "Impact Numérique",
    tagline: "Renforcez votre présence en ligne",
    details: [
      "Solution E-commerce Simplifiée",
      "Production de Contenu Vidéo",
      "Refonte & Modernisation de Site Web",
      "Site Vitrine \"Clé en Main\”",
    ],
  },
  {
    icon: BarChart3,
    title: "Valorisation des Données",
    tagline: "Exploitez la puissance de vos données",
    details: [
      "Analyse de Données & Insights",
      "Tableau de Bord et Visualisation",
      "Modèle de Prédiction ML Simple",
      "Audit & Nettoyage de Données",
      "Pipeline de Données Automatisé",
    ],
  },
  {
    icon: Cog,
    title: "Automatisation",
    tagline: "Optimisez vos processus métier",
    details: [
      "Scripts d'Automatisation de Tâches",
      "Intégration & Connecteurs API",
      "POC, MVP et outils sur mesure",
      "Applicatif Léger avec Visuel",
    ],
  },
  {
    icon: Lightbulb,
    title: "Développement Produit & Innovation",
    tagline: "Optimisez vos processus métier",
    details: [
      "POC (Proof of Concept)",
      "MVP (Minimum Viable Product)",
    ],
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="section-padding bg-background opacity-0 animate-fade-up-subtle [animation-delay:320ms] [animation-fill-mode:forwards]">
      <div className="container-narrow">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Nos offres numériques
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Quatre pôles d'expertise pour répondre à vos besoins de transformation digitale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <div
              key={service.title}
              className="flip-card h-[360px] lg:h-[380px]"
            >
              <div className="flip-card-inner">
                {/* Front */}
                <div className="flip-card-front bg-card rounded-2xl border border-border p-8 flex flex-col items-center justify-center text-center shadow-sm hover:border-primary/30 transition-colors">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                    <service.icon className="w-7 h-7 lg:w-8 lg:h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-bold text-foreground mb-2.5">
                    {service.title}
                  </h3>
                  <p className="text-sm lg:text-base text-muted-foreground">
                    {service.tagline}
                  </p>
                  <div className="mt-5 text-xs lg:text-sm text-muted-foreground/70">
                    Survolez pour découvrir →
                  </div>
                </div>

                {/* Back */}
                <div className="flip-card-back bg-gradient-to-br from-primary to-primary/90 rounded-2xl p-6 lg:p-7 flex flex-col justify-center shadow-xl">
                  <h3 className="text-base lg:text-lg font-bold text-primary-foreground mb-3.5">
                    {service.title}
                  </h3>
                  <ul className="space-y-2.5">
                    {service.details.map((detail, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2.5 text-primary-foreground/90 text-xs lg:text-sm"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/60 mt-1.5 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
