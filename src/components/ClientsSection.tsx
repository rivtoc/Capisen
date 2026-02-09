import { Building2 } from "lucide-react";
import logoConfede from "@/assets/Confederation_paysanne.png";
// Placeholder clients - can be updated with real data
const clients = [
  {
    name: "Confédération Paysanne",
    description: "Syndicat agricole national défendant une agriculture paysanne, durable et solidaire.",
    project: "Outil de traitement automatisé des notifications SAFER (récupération, tri géographique et envoi groupé).",
    logo: logoConfede,
  },
  {
    name: "Startup Tech",
    description: "Jeune pousse innovante dans le secteur maritime.",
    project: "Dashboard de visualisation de données",
    logo: null,
  },
  {
    name: "Association Brestoise",
    description: "Organisation à but non lucratif active localement.",
    project: "Automatisation des processus internes",
    logo: null,
  },
];

const ClientsSection = () => {
  return (
    <section id="clients" className="section-padding bg-background opacity-0 animate-fade-up-subtle [animation-delay:420ms] [animation-fill-mode:forwards]">
      <div className="container-narrow">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Ils nous font confiance
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Des entreprises et organisations qui ont choisi CAPISEN pour leurs projets numériques.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {clients.map((client) => (
            <div
              key={client.name}
              className="group relative bg-card rounded-xl border border-border p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-foreground/20 overflow-hidden"
            >
              {/* Default state */}
              <div className="flex flex-col items-center text-center transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-4">
                <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center mb-4">
                  {client.logo ? (
                    <img
                      src={client.logo}
                      alt={client.name}
                      className="w-16 h-16 object-contain"
                    />
                  ) : (
                    <Building2 className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {client.name}
                </h3>
              </div>

              {/* Hover state */}
              <div className="absolute inset-0 p-8 flex flex-col justify-center bg-card opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {client.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {client.description}
                </p>
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Projet réalisé
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {client.project}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          Vous souhaitez rejoindre nos partenaires ?{" "}
          <a
            href="#contact"
            className="text-foreground font-medium link-underline"
          >
            Contactez-nous
          </a>
        </p>
      </div>
    </section>
  );
};

export default ClientsSection;
