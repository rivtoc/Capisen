import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

interface Props {
  score: number; // 0-10
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-500";
  if (score >= 6) return "text-amber-500";
  return "text-red-500";
}

export default function AnimatedScoreBar({ score }: Props) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDisplayed(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <Progress value={displayed * 10} className="h-2" />
      </div>
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className={`text-lg font-bold shrink-0 ${scoreColor(score)}`}
      >
        {score}/10
      </motion.span>
    </div>
  );
}
