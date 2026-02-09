import { Linkedin, MapPin } from "lucide-react";
import logo from "@/assets/logo-capisen.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-narrow section-padding !py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <img
              src={logo}
              alt="CAPISEN"
              className="h-8 w-auto invert"
            />
            <p className="text-sm text-primary-foreground/70 text-center md:text-left">
              Junior Initiative ISEN Brest
            </p>
            <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
              <MapPin className="w-4 h-4" />
              Brest, France
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-4">
            <a
              href="https://www.linkedin.com/company/capisen"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
            >
              <Linkedin className="w-5 h-5" />
              Suivez-nous sur LinkedIn
            </a>
            <a
              href="mailto:contact@capisen.fr"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
            >
              contact@capisen.fr
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-primary-foreground/10 text-center">
          <p className="text-sm text-primary-foreground/50">
            © {currentYear} CAPISEN. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
