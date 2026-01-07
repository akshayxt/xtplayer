import { useEffect, useState } from 'react';
import { Play, Music2, Headphones, Radio } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1300),
      setTimeout(() => setPhase(4), 2500),
      setTimeout(() => {
        setPhase(5);
        setTimeout(onComplete, 600);
      }, 3000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden transition-all duration-700 ${
        phase >= 5 ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, hsl(0, 0%, 2%) 0%, hsl(0, 0%, 6%) 50%, hsl(0, 10%, 5%) 100%)',
      }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl transition-all duration-1000 ${
            phase >= 1 ? 'opacity-40 scale-100' : 'opacity-0 scale-50'
          }`}
          style={{ background: 'radial-gradient(circle, hsl(0, 85%, 55%) 0%, transparent 70%)' }}
        />
        <div
          className={`absolute -bottom-48 -right-32 w-[500px] h-[500px] rounded-full blur-3xl transition-all duration-1000 delay-200 ${
            phase >= 1 ? 'opacity-30 scale-100' : 'opacity-0 scale-50'
          }`}
          style={{ background: 'radial-gradient(circle, hsl(0, 70%, 45%) 0%, transparent 70%)' }}
        />
        <div
          className={`absolute top-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl transition-all duration-1000 delay-300 ${
            phase >= 2 ? 'opacity-20 scale-100' : 'opacity-0 scale-50'
          }`}
          style={{ background: 'radial-gradient(circle, hsl(350, 80%, 50%) 0%, transparent 70%)' }}
        />
      </div>

      {/* Floating music icons */}
      <div className="absolute inset-0 pointer-events-none">
        {[Music2, Headphones, Radio, Music2].map((Icon, index) => (
          <div
            key={index}
            className={`absolute transition-all duration-1000 ${
              phase >= 2 ? 'opacity-20' : 'opacity-0'
            }`}
            style={{
              top: `${20 + index * 20}%`,
              left: `${10 + index * 25}%`,
              transform: `translateY(${phase >= 2 ? '0' : '20px'}) rotate(${index * 15}deg)`,
              transitionDelay: `${index * 150}ms`,
            }}
          >
            <Icon className="w-8 h-8 text-primary/30" />
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-8 z-10">
        {/* Logo container with glass effect */}
        <div
          className={`relative transition-all duration-700 ${
            phase >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90'
          }`}
        >
          {/* Outer glow ring */}
          <div
            className={`absolute -inset-8 rounded-[40px] transition-all duration-1000 ${
              phase >= 2 ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              background: 'radial-gradient(circle, hsl(0, 85%, 55%, 0.15) 0%, transparent 70%)',
            }}
          />
          
          {/* Glass background */}
          <div
            className={`relative w-32 h-32 rounded-[32px] flex items-center justify-center overflow-hidden transition-all duration-500 ${
              phase >= 1 ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              background: 'linear-gradient(145deg, hsl(0, 85%, 55%) 0%, hsl(0, 75%, 40%) 100%)',
              boxShadow: phase >= 2 
                ? '0 0 60px hsl(0, 85%, 55%, 0.5), 0 20px 60px hsl(0, 0%, 0%, 0.5), inset 0 1px 0 hsl(0, 85%, 70%, 0.3)' 
                : '0 10px 40px hsl(0, 0%, 0%, 0.3)',
            }}
          >
            {/* Glass overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
            
            {/* Play icon with animation */}
            <Play 
              className={`w-16 h-16 text-primary-foreground fill-current relative z-10 transition-all duration-500 ${
                phase >= 2 ? 'scale-100' : 'scale-75'
              }`}
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              }}
            />
            
            {/* Shine effect */}
            <div 
              className={`absolute inset-0 transition-all duration-1000 ${
                phase >= 2 ? 'translate-x-full' : '-translate-x-full'
              }`}
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
              }}
            />
          </div>

          {/* Pulsing ring */}
          <div
            className={`absolute -inset-4 rounded-[40px] border-2 border-primary/30 transition-all duration-500 ${
              phase >= 2 ? 'opacity-100 animate-ping-slow' : 'opacity-0'
            }`}
          />
        </div>

        {/* Text content */}
        <div className="text-center">
          <h1
            className={`text-5xl font-extrabold tracking-tight transition-all duration-700 ${
              phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span 
              className="inline-block"
              style={{
                background: 'linear-gradient(135deg, hsl(0, 85%, 60%) 0%, hsl(0, 80%, 50%) 50%, hsl(350, 85%, 55%) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            >
              XT
            </span>
            <span className="text-foreground ml-2">Builds</span>
          </h1>
          
          <p
            className={`text-muted-foreground mt-3 text-base tracking-wide transition-all duration-700 delay-200 ${
              phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Premium Music Experience
          </p>
        </div>

        {/* Equalizer bars animation */}
        <div
          className={`flex items-end gap-1 h-8 transition-all duration-500 ${
            phase >= 3 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {[0.6, 1, 0.4, 0.8, 0.5, 1, 0.7].map((height, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-primary animate-equalizer"
              style={{
                animationDelay: `${i * 100}ms`,
                height: phase >= 3 ? `${height * 32}px` : '4px',
                transition: 'height 0.3s ease-out',
                transitionDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>

        {/* Loading text */}
        <p
          className={`text-xs text-muted-foreground/60 tracking-widest uppercase transition-all duration-500 ${
            phase >= 4 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Loading your music...
        </p>
      </div>

      {/* Bottom gradient fade */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, hsl(0, 0%, 4%) 0%, transparent 100%)',
        }}
      />
    </div>
  );
};

export default SplashScreen;
