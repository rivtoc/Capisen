import { Users, Calendar, GraduationCap } from "lucide-react";
import teamPhoto from "@/assets/Organigramme.png";

const stats = [
  {
    icon: Users,
    value: "17",
    label: "Membres",
    description: "Une équipe dynamique et passionnée",
  },
  {
    icon: Calendar,
    value: "2008",
    label: "Depuis",
    description: "Plus de 15 ans d'expérience",
  },
  {
    icon: GraduationCap,
    value: "1000+",
    label: "Étudiants",
    description: "Mobilisables pour vos projets",
  },
];

const TeamSection = () => {
  return (
    <section id="team" className="section-padding bg-background opacity-0 animate-fade-up-subtle [animation-delay:220ms] [animation-fill-mode:forwards]">
      <div className="container-narrow">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-12 lg:gap-16 items-stretch">
          {/* Left side - Content */}
          <div className="order-2 lg:order-1 flex flex-col">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Notre équipe
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            CAPISEN rassemble une équipe de 17 étudiants ingénieurs de l'ISEN. 
            Nous pouvons mobiliser les compétences des 1000+ étudiants de l'école, 
            permettant de répondre à des projets de toutes envergures. 
            Notre force réside dans cette capacité d'adaptation et notre engagement 
            à fournir des solutions de qualité.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-auto">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300 card-hover"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm font-semibold text-foreground mb-1">
                    {stat.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stat.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Photo */}
          <div className="order-1 lg:order-2">
            <div className="relative rounded-2xl overflow-hidden shadow-xl h-full min-h-[400px] lg:min-h-[500px] bg-card flex items-center justify-center p-4">
              <img 
                src={teamPhoto} 
                alt="Équipe CAPISEN" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
