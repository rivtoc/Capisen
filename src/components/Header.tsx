import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo-capisen.png";

const Header = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 opacity-0 animate-fade-in [animation-delay:60ms] [animation-fill-mode:forwards] ${
        scrolled
          ? "bg-background/95 backdrop-blur-sm border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container-narrow section-padding !py-4 flex items-center justify-between">
        <a href="#" className="flex items-center">
          <img
            src={logo}
            alt="CAPISEN - Junior Entreprise ISEN Brest"
            className="h-8 md:h-10 w-auto"
          />
        </a>

        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollToSection("presentation")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors link-underline"
          >
            À propos
          </button>
          <button
            onClick={() => scrollToSection("team")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors link-underline"
          >
            Notre équipe
          </button>

          <button
            onClick={() => scrollToSection("services")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors link-underline"
          >
            Nos offres
          </button>
          
          <button
            onClick={() => scrollToSection("contact")}
            className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Nous contacter
          </button>
          <button
            onClick={() => navigate("/login")}
            className="px-5 py-2.5 bg-transparent text-primary border border-primary text-sm font-medium rounded-lg hover:bg-primary/10 transition-colors"
          >
            Espace membres
          </button>
        </nav>

        {/* Mobile CTA */}
        <button
          onClick={() => scrollToSection("contact")}
          className="md:hidden px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          Contact
        </button>
      </div>
    </header>
  );
};

export default Header;
