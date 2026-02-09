import { useState, useEffect } from "react";
import logoCapisen from "../assets/logo-capisen.png";

const words = [
  /*"Soudé", 
  "Ambitieux",
  "Déterminé",*/
];

interface EntryLoaderProps {
  onComplete: () => void;
}

const EntryLoader = ({ onComplete }: EntryLoaderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (currentIndex < words.length) {
      // Show next word
      const timer = setTimeout(() => {
        setIsFading(true);
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
          setIsFading(false);
        }, 200);
      }, 500);
      return () => clearTimeout(timer);
    } else if (currentIndex === words.length) {
      // Show logo
      const timer = setTimeout(() => {
        setIsFading(true);
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
          setIsFading(false);
        }, 200);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      // Logo shown, fade out loader
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 500);
      }, 300);
    }
  }, [currentIndex, onComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center animate-fade-out pointer-events-none">
        <img 
          src={logoCapisen} 
          alt="CAPISEN" 
          className="h-12 md:h-16 lg:h-20 opacity-0"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
      {/* Background gradient orb */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
        style={{
          background: "var(--gradient-accent)",
        }}
      />
      
      {currentIndex < words.length && (
        <span 
          className={`text-3xl md:text-5xl lg:text-6xl font-bold transition-all duration-200 ${
            isFading 
              ? "opacity-0 translate-y-4" 
              : "opacity-100 translate-y-0"
          } text-foreground`}
        >
          {words[currentIndex]}
        </span>
      )}
      {currentIndex === words.length && (
        <img 
          src={logoCapisen} 
          alt="CAPISEN" 
          className={`h-12 md:h-16 lg:h-20 transition-all duration-200 ${
            isFading 
              ? "opacity-0 translate-y-4" 
              : "opacity-100 translate-y-0"
          }`}
        />
      )}
    </div>
  );
};

export default EntryLoader;
