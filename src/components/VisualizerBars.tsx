import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface VisualizerBarsProps {
  frequencyData: Uint8Array | null;
  isPlaying: boolean;
  barCount?: number;
  className?: string;
  variant?: 'default' | 'compact' | 'mini';
}

const VisualizerBars = ({
  frequencyData,
  isPlaying,
  barCount = 24,
  className,
  variant = 'default',
}: VisualizerBarsProps) => {
  // Sample frequency data to bar count
  const bars = useMemo(() => {
    if (!frequencyData || frequencyData.length === 0) {
      return new Array(barCount).fill(0);
    }

    const step = Math.floor(frequencyData.length / barCount);
    const result: number[] = [];

    for (let i = 0; i < barCount; i++) {
      const index = Math.min(i * step, frequencyData.length - 1);
      // Apply some smoothing and boost lower frequencies
      const boost = i < barCount * 0.3 ? 1.3 : i < barCount * 0.6 ? 1.1 : 1;
      result.push(Math.min((frequencyData[index] / 255) * boost, 1));
    }

    return result;
  }, [frequencyData, barCount]);

  const heights = useMemo(() => {
    switch (variant) {
      case 'compact':
        return { max: 32, min: 2 };
      case 'mini':
        return { max: 16, min: 1 };
      default:
        return { max: 48, min: 3 };
    }
  }, [variant]);

  const barWidth = useMemo(() => {
    switch (variant) {
      case 'compact':
        return 'w-1';
      case 'mini':
        return 'w-0.5';
      default:
        return 'w-1.5';
    }
  }, [variant]);

  return (
    <div
      className={cn(
        'flex items-end justify-center gap-px',
        variant === 'default' && 'h-12',
        variant === 'compact' && 'h-8',
        variant === 'mini' && 'h-4',
        className
      )}
    >
      {bars.map((value, index) => {
        const height = isPlaying && value > 0
          ? heights.min + value * (heights.max - heights.min)
          : heights.min;
        
        // Create color gradient based on position
        const hue = 0 + (index / barCount) * 30; // Red to orange
        const saturation = 75 + value * 15;
        const lightness = 50 + value * 10;

        return (
          <div
            key={index}
            className={cn(
              barWidth,
              'rounded-full transition-all duration-75',
              !isPlaying && 'bg-muted-foreground/30'
            )}
            style={{
              height: `${height}px`,
              backgroundColor: isPlaying
                ? `hsl(${hue}, ${saturation}%, ${lightness}%)`
                : undefined,
              boxShadow: isPlaying && value > 0.5
                ? `0 0 ${value * 8}px hsl(${hue}, ${saturation}%, ${lightness}%)`
                : undefined,
            }}
          />
        );
      })}
    </div>
  );
};

export default VisualizerBars;
