import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PresentationSection from "@/components/PresentationSection";
import TeamSection from "@/components/TeamSection";
import ServicesSection from "@/components/ServicesSection";
import ClientsSection from "@/components/ClientsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
// import EntryLoader from "@/components/EntryLoader"; // Mis de côté — réactiver si besoin du loader d’entrée
import MouseFollower from "@/components/MouseFollower";
import SectionDivider from "@/components/SectionDivider";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <MouseFollower />
      <Header />
      <main>
        <HeroSection />
        <PresentationSection />
        <TeamSection />
        <SectionDivider />
        <ServicesSection />
        <SectionDivider />
       
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
