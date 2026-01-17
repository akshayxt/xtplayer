import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  variant?: 'bars' | 'wave' | 'circular';
  barCount?: number;
  className?: string;
  color?: 'primary' | 'gradient' | 'spectrum';
}

const AudioVisualizer = ({
  audioElement,
  isPlaying,
  variant = 'bars',
  barCount = 32,
  className,
  color = 'gradient',
}: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>(new Array(barCount).fill(0));

  // Initialize Web Audio API
  const initializeAudio = useCallback(() => {
    if (!audioElement || isInitialized) return;

    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Create media element source (only once per audio element)
      if (!sourceRef.current) {
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        sourceRef.current = source;
      }

      setIsInitialized(true);
      console.log('[Visualizer] Audio context initialized');
    } catch (error) {
      console.error('[Visualizer] Failed to initialize:', error);
    }
  }, [audioElement, isInitialized]);

  // Visualize frequency data
  const visualize = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (variant === 'bars') {
        drawBars(ctx, canvas, dataArray, bufferLength);
      } else if (variant === 'wave') {
        drawWave(ctx, canvas, dataArray, bufferLength);
      } else if (variant === 'circular') {
        drawCircular(ctx, canvas, dataArray, bufferLength);
      }

      // Update frequency data for fallback animation
      const newData = Array.from(dataArray).slice(0, barCount);
      setFrequencyData(newData);
    };

    draw();
  }, [variant, barCount, color]);

  // Draw bar visualization
  const drawBars = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    dataArray: Uint8Array,
    bufferLength: number
  ) => {
    const barWidth = (canvas.width / barCount) * 0.8;
    const gap = (canvas.width / barCount) * 0.2;
    let x = 0;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * bufferLength);
      const barHeight = (dataArray[dataIndex] / 255) * canvas.height * 0.9;

      // Create gradient based on color prop
      let gradient: CanvasGradient;
      if (color === 'spectrum') {
        const hue = (i / barCount) * 360;
        ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
      } else if (color === 'gradient') {
        gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, 'hsl(var(--primary))');
        gradient.addColorStop(0.5, 'hsl(var(--primary) / 0.7)');
        gradient.addColorStop(1, 'hsl(350, 85%, 60%)');
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = 'hsl(var(--primary))';
      }

      // Draw bar with rounded top
      const radius = barWidth / 2;
      const y = canvas.height - barHeight;
      
      ctx.beginPath();
      ctx.moveTo(x, canvas.height);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, canvas.height);
      ctx.closePath();
      ctx.fill();

      // Add glow effect
      ctx.shadowColor = 'hsl(var(--primary) / 0.5)';
      ctx.shadowBlur = 10;

      x += barWidth + gap;
    }
    
    ctx.shadowBlur = 0;
  };

  // Draw wave visualization
  const drawWave = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    dataArray: Uint8Array,
    bufferLength: number
  ) => {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'hsl(var(--primary))';
    ctx.shadowColor = 'hsl(var(--primary))';
    ctx.shadowBlur = 15;

    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  // Draw circular visualization
  const drawCircular = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    dataArray: Uint8Array,
    bufferLength: number
  ) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.4;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * bufferLength);
      const barHeight = (dataArray[dataIndex] / 255) * radius;
      const angle = (i / barCount) * Math.PI * 2;

      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);

      const hue = (i / barCount) * 60; // Red to yellow spectrum
      ctx.strokeStyle = `hsl(${hue}, 85%, 55%)`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = `hsl(${hue}, 85%, 55%)`;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  };

  // Initialize on audio element change
  useEffect(() => {
    if (audioElement && isPlaying) {
      initializeAudio();
    }
  }, [audioElement, isPlaying, initializeAudio]);

  // Start/stop visualization
  useEffect(() => {
    if (isInitialized && isPlaying) {
      // Resume audio context if suspended
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      visualize();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isInitialized, isPlaying, visualize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Fallback CSS animation when Web Audio API isn't available
  if (!isInitialized) {
    return (
      <div className={cn('flex items-end justify-center gap-0.5 h-8', className)}>
        {Array.from({ length: Math.min(barCount, 16) }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-1 rounded-full transition-all duration-150',
              isPlaying ? 'animate-equalizer bg-primary' : 'bg-muted-foreground/30'
            )}
            style={{
              height: isPlaying ? `${20 + Math.sin(i * 0.5) * 12}px` : '4px',
              animationDelay: `${i * 50}ms`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={60}
      className={cn('w-full h-full', className)}
    />
  );
};

export default AudioVisualizer;
