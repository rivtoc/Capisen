import { useState, useEffect, useCallback } from "react";

const MouseFollower = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches || 
                  'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Use requestAnimationFrame for smooth performance
    requestAnimationFrame(() => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isMobile, handleMouseMove, handleMouseLeave]);

  if (isMobile) return null;

  return (
    <div
      className="pointer-events-none fixed z-[50] transition-opacity duration-300"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
        opacity: isVisible ? 1 : 0,
      }}
    >
      <div
        className="w-[300px] h-[300px] rounded-full blur-3xl"
        style={{
          background: "linear-gradient(135deg, hsl(var(--foreground) / 0.04) 0%, hsl(var(--muted-foreground) / 0.06) 50%, hsl(var(--primary) / 0.05) 100%)",
          transition: "left 0.15s ease-out, top 0.15s ease-out",
        }}
      />
    </div>
  );
};

export default MouseFollower;
