import { ArrowDown } from "lucide-react";

const HeroSection = () => {
  const scrollToContact = () => {
    const element = document.getElementById("contact");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToPresentation = () => {
    const element = document.getElementById("presentation");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-gray-100 via-gray-50 to-white" />
      
      {/* Subtle animated shapes */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-40">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gray-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-1/3 -right-48 w-96 h-96 bg-gray-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-gray-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="container-narrow section-padding text-center pt-32 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Badge Junior-Entreprise */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-foreground/5 border border-foreground/10 rounded-full text-sm font-medium mb-8 animate-fade-up">
            <span className="w-2 h-2 bg-foreground rounded-full animate-pulse"></span>
            Junior-Initiative ISEN Brest
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight tracking-tight animate-fade-up">
            Capisen
            <span className="block mt-4 text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-muted-foreground">
              Votre équipe numérique dédiée
            </span>
          </h1>

          <p className="mt-10 text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-up delay-100">
            Nous transformons vos projets digitaux en solutions concrètes : développement web, valorisation de données, automatisation et innovation produit.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-200">
            <button
              onClick={scrollToContact}
              className="group px-8 py-4 bg-black text-white font-semibold rounded-xl hover:shadow-2xl hover:shadow-black/25 transition-all duration-300 hover:scale-105"
            >
              <span className="flex items-center justify-center gap-2">
                Démarrer un projet
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
            <button
              onClick={scrollToPresentation}
              className="px-8 py-4 bg-white text-black font-semibold rounded-xl border-2 border-black hover:bg-black hover:text-white transition-all duration-200"
            >
              Découvrir nos solutions
            </button>
          </div>
        </div>
      </div>

     
    </section>
  );
};

export default HeroSection;
