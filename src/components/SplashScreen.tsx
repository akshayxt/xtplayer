import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-splash-scale">
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center animate-pulse-glow">
            <Play className="w-12 h-12 text-primary-foreground fill-current" />
          </div>
          <div className="absolute -inset-4 rounded-3xl bg-primary/20 blur-xl -z-10" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="gradient-text">XT</span>
            <span className="text-foreground"> Builds</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Premium Music Experience</p>
        </div>
        <div className="flex gap-1 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
