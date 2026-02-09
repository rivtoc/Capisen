import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  company: z.string().trim().max(100).optional(),
  message: z.string().trim().min(10, "Le message doit contenir au moins 10 caractères").max(2000),
});

type ContactFormData = z.infer<typeof contactSchema>;

const ContactSection = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ContactFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof ContactFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // En dev : proxy Vite vers le serveur. En prod : définir VITE_API_URL (ex. https://votresite.com).
      const apiBase = import.meta.env.VITE_API_URL ?? '';
      const response = await fetch('/api/contact', {  // ← Pas de VITE_API_URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result.data),
      });

      let data: { details?: string; error?: string } = {};
      try {
        data = await response.json();
      } catch {
        if (!response.ok) {
          throw new Error('Le serveur ne répond pas. Vérifiez que le serveur est démarré (npm run dev:server).');
        }
      }

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Erreur lors de l\'envoi du message');
      }

      setIsSubmitted(true);
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Erreur lors de l\'envoi du message. Veuillez réessayer.';
      setErrors({ message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <section id="contact" className="section-padding bg-gradient-to-b from-background to-accent/30 opacity-0 animate-fade-up-subtle [animation-delay:80ms] [animation-fill-mode:forwards]">
        <div className="container-narrow">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
              <CheckCircle className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Message envoyé !
            </h2>
            <p className="text-lg text-muted-foreground">
              Merci pour votre message. Notre équipe vous répondra dans les plus brefs délais.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="section-padding bg-gradient-to-b from-background to-accent/30 opacity-0 animate-fade-up-subtle [animation-delay:520ms] [animation-fill-mode:forwards]">
      <div className="container-narrow">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Contactez CAPISEN
            </h2>
            <p className="text-lg text-muted-foreground">
              Parlez-nous de votre projet. Nous vous répondrons sous 48h.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Nom complet *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                  errors.name ? "border-destructive" : "border-border"
                }`}
                placeholder="Jean Dupont"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                  errors.email ? "border-destructive" : "border-border"
                }`}
                placeholder="jean@entreprise.fr"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="company"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Entreprise
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder="Nom de votre entreprise (optionnel)"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Votre message *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={5}
                className={`w-full px-4 py-3 rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none ${
                  errors.message ? "border-destructive" : "border-border"
                }`}
                placeholder="Décrivez votre projet ou votre besoin..."
              />
              {errors.message && (
                <p className="mt-1 text-sm text-destructive">{errors.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-8 py-4 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  Envoyer le message
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Ou écrivez-nous directement à{" "}
            <a
              href="mailto:contact@capisen.fr"
              className="text-foreground font-medium link-underline"
            >
              contact@capisen.fr
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
