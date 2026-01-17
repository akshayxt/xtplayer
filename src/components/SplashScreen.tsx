import { useEffect, useState, useMemo } from 'react';
import { Play, Music2, Headphones, Radio, Disc, Waves } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

// Particle component for floating elements
const FloatingParticle = ({ 
  delay, 
  duration, 
  size, 
  startX, 
  startY 
}: { 
  delay: number; 
  duration: number; 
  size: number; 
  startX: number; 
  startY: number; 
}) => (
  <div
    className="absolute rounded-full bg-primary/20 animate-float-particle"
    style={{
      width: size,
      height: size,
      left: `${startX}%`,
      top: `${startY}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    }}
  />
);

// Waveform bar component
const WaveformBar = ({ index, phase }: { index: number; phase: number }) => {
  const heights = [0.3, 0.7, 0.5, 1, 0.4, 0.8, 0.6, 0.9, 0.35, 0.75];
  const baseHeight = heights[index % heights.length];
  
  return (
    <div
      className="w-1 rounded-full bg-gradient-to-t from-primary to-primary/60 transition-all duration-300"
      style={{
        height: phase >= 3 ? `${baseHeight * 40}px` : '4px',
        animationDelay: `${index * 80}ms`,
        animation: phase >= 3 ? `waveform 0.8s ease-in-out ${index * 80}ms infinite alternate` : 'none',
      }}
    />
  );
};

// Orbiting icon component
const OrbitingIcon = ({ 
  Icon, 
  angle, 
  radius, 
  phase, 
  delay 
}: { 
  Icon: React.ElementType; 
  angle: number; 
  radius: number; 
  phase: number; 
  delay: number;
}) => {
  const x = Math.cos((angle * Math.PI) / 180) * radius;
  const y = Math.sin((angle * Math.PI) / 180) * radius;
  
  return (
    <div
      className={`absolute transition-all duration-1000 ${phase >= 2 ? 'opacity-40' : 'opacity-0'}`}
      style={{
        transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`,
        transitionDelay: `${delay}ms`,
        animation: phase >= 2 ? `orbit 20s linear infinite` : 'none',
      }}
    >
      <Icon className="w-6 h-6 text-primary/50" />
    </div>
  );
};

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Generate particles once
  const particles = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 4,
      size: 4 + Math.random() * 8,
      startX: Math.random() * 100,
      startY: Math.random() * 100,
    })), []
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1100),
      setTimeout(() => setPhase(4), 1800),
      setTimeout(() => setPhase(5), 2600),
      setTimeout(() => {
        setPhase(6);
        setTimeout(onComplete, 500);
      }, 3200),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden transition-all duration-700 ${
        phase >= 6 ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at center, hsl(var(--background)) 0%, hsl(0, 0%, 2%) 100%)',
      }}
    >
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={`absolute w-[800px] h-[800px] rounded-full blur-[120px] transition-all duration-1500 ${
            phase >= 1 ? 'opacity-60 scale-100' : 'opacity-0 scale-50'
          }`}
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${mousePosition.x}px, ${mousePosition.y}px)`,
            transition: 'transform 0.3s ease-out, opacity 1.5s ease-out, scale 1.5s ease-out',
          }}
        />
        
        {/* Secondary orbs */}
        <div
          className={`absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full blur-[100px] transition-all duration-1000 ${
            phase >= 1 ? 'opacity-30' : 'opacity-0'
          }`}
          style={{ background: 'radial-gradient(circle, hsl(0, 85%, 60%) 0%, transparent 70%)' }}
        />
        <div
          className={`absolute -bottom-32 -right-20 w-[600px] h-[600px] rounded-full blur-[100px] transition-all duration-1000 delay-300 ${
            phase >= 1 ? 'opacity-25' : 'opacity-0'
          }`}
          style={{ background: 'radial-gradient(circle, hsl(350, 80%, 50%) 0%, transparent 70%)' }}
        />
        <div
          className={`absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full blur-[80px] transition-all duration-1000 delay-500 ${
            phase >= 2 ? 'opacity-20' : 'opacity-0'
          }`}
          style={{ background: 'radial-gradient(circle, hsl(10, 90%, 55%) 0%, transparent 70%)' }}
        />
      </div>

      {/* Floating particles */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
        {particles.map((p) => (
          <FloatingParticle key={p.id} {...p} />
        ))}
      </div>

      {/* Grid pattern overlay */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ${phase >= 1 ? 'opacity-[0.03]' : 'opacity-0'}`}
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-10 z-10">
        {/* Logo container with advanced effects */}
        <div
          className={`relative transition-all duration-700 ${
            phase >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-75'
          }`}
        >
          {/* Orbiting icons */}
          <div className="absolute inset-0 flex items-center justify-center">
            <OrbitingIcon Icon={Music2} angle={0} radius={100} phase={phase} delay={0} />
            <OrbitingIcon Icon={Headphones} angle={72} radius={100} phase={phase} delay={100} />
            <OrbitingIcon Icon={Radio} angle={144} radius={100} phase={phase} delay={200} />
            <OrbitingIcon Icon={Disc} angle={216} radius={100} phase={phase} delay={300} />
            <OrbitingIcon Icon={Waves} angle={288} radius={100} phase={phase} delay={400} />
          </div>

          {/* Outer pulse rings */}
          {[1, 2, 3].map((ring) => (
            <div
              key={ring}
              className={`absolute rounded-full border border-primary/20 transition-all duration-1000 ${
                phase >= 2 ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                inset: `-${ring * 20}px`,
                animation: phase >= 2 ? `pulse-ring 2s ease-out ${ring * 0.3}s infinite` : 'none',
              }}
            />
          ))}

          {/* Main logo glass card */}
          <div
            className={`relative w-36 h-36 rounded-[36px] flex items-center justify-center overflow-hidden transition-all duration-700 ${
              phase >= 1 ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              background: 'linear-gradient(145deg, hsl(var(--primary)) 0%, hsl(0, 75%, 35%) 100%)',
              boxShadow: phase >= 2 
                ? '0 0 80px hsl(var(--primary) / 0.6), 0 25px 80px hsl(0, 0%, 0% / 0.6), inset 0 2px 0 hsl(0, 85%, 75% / 0.4), inset 0 -2px 4px hsl(0, 0%, 0% / 0.3)' 
                : '0 15px 50px hsl(0, 0%, 0% / 0.4)',
              transform: `perspective(1000px) rotateX(${mousePosition.y * 0.1}deg) rotateY(${mousePosition.x * 0.1}deg)`,
              transition: 'transform 0.2s ease-out, box-shadow 0.7s ease-out, opacity 0.7s ease-out',
            }}
          >
            {/* Glass reflection layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            
            {/* Animated noise texture */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
              }}
            />
            
            {/* Play icon with glow */}
            <div className="relative">
              <Play 
                className={`w-20 h-20 text-primary-foreground fill-current relative z-10 transition-all duration-500 drop-shadow-2xl ${
                  phase >= 2 ? 'scale-100' : 'scale-50'
                }`}
                style={{
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
                }}
              />
              {/* Icon glow */}
              <div 
                className={`absolute inset-0 blur-xl transition-opacity duration-500 ${phase >= 2 ? 'opacity-50' : 'opacity-0'}`}
                style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }}
              />
            </div>
            
            {/* Animated shine sweep */}
            <div 
              className={`absolute inset-0 transition-all duration-1500 ${
                phase >= 2 ? 'translate-x-[200%]' : '-translate-x-[100%]'
              }`}
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                width: '50%',
              }}
            />
          </div>
        </div>

        {/* Text content with staggered reveal */}
        <div className="text-center space-y-4">
          <h1
            className={`text-6xl font-black tracking-tight transition-all duration-700 ${
              phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <span 
              className="inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(0, 90%, 65%) 50%, hsl(350, 85%, 55%) 100%)',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              }}
            >
              XT
            </span>
            <span className="text-foreground ml-3 font-bold">Builds</span>
          </h1>
          
          <p
            className={`text-muted-foreground text-lg tracking-widest uppercase transition-all duration-700 ${
              phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '150ms' }}
          >
            Premium Music Experience
          </p>
        </div>

        {/* Advanced waveform visualizer */}
        <div
          className={`flex items-end justify-center gap-1.5 h-12 transition-all duration-500 ${
            phase >= 3 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <WaveformBar key={i} index={i} phase={phase} />
          ))}
        </div>

        {/* Loading progress bar */}
        <div
          className={`relative w-48 h-1 bg-muted/30 rounded-full overflow-hidden transition-all duration-500 ${
            phase >= 4 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-1000 ease-out"
            style={{ 
              width: phase >= 5 ? '100%' : phase >= 4 ? '60%' : '0%',
            }}
          />
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
            style={{ backgroundSize: '200% 100%' }}
          />
        </div>

        {/* Status text with typing effect */}
        <p
          className={`text-xs text-muted-foreground/70 tracking-[0.3em] uppercase transition-all duration-500 ${
            phase >= 4 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {phase >= 5 ? 'Ready to play' : 'Loading your music...'}
        </p>
      </div>

      {/* Bottom vignette */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, hsl(0, 0%, 3%) 0%, transparent 100%)',
        }}
      />

      {/* Custom keyframes */}
      <style>{`
        @keyframes waveform {
          0% { transform: scaleY(0.5); }
          100% { transform: scaleY(1); }
        }
        
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.3; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(100px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(100px) rotate(-360deg); }
        }
        
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.6; }
          50% { transform: translateY(-20px) translateX(-10px); opacity: 0.4; }
          75% { transform: translateY(-40px) translateX(5px); opacity: 0.5; }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        .animate-float-particle {
          animation: float-particle 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
