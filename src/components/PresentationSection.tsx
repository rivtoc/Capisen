import { Users, Lightbulb, Award, MapPin } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Équipe dédiée",
    description: "Des étudiants ingénieurs de l'ISEN mobilisés sur vos projets du début à la fin.",
  },
  {
    icon: Lightbulb,
    title: "Savoir-faire technique",
    description: "Des compétences d'ingénieurs numériques adaptées à vos projets.",
  },
  {
    icon: Award,
    title: "Suivi de qualité",
    description: "Suivi de projet, livrables documentés et respect des engagements.",
  },
  {
    icon: MapPin,
    title: "Ancrage local",
    description: "Basés à Brest, membres du réseau national des Junior-Entreprises.",
  },
];

const PresentationSection = () => {
  return (
    <section id="presentation" className="section-padding bg-background opacity-0 animate-fade-up-subtle [animation-delay:120ms] [animation-fill-mode:forwards]">
      <div className="container-narrow">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-6">
            CAPISEN, la Junior Initiative de l'ISEN Brest
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            CAPISEN est une équipe d'étudiants ingénieurs qui accompagne les entreprises dans leurs projets numériques. Nous mettons notre expertise technique au service de vos ambitions, du développement web à la valorisation de données.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-xl bg-card hover:bg-accent transition-all duration-300 card-hover border border-border"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <feature.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PresentationSection;
