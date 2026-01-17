import { useEffect, useRef, useState, useCallback } from 'react';

interface VisualizerData {
  frequencyData: Uint8Array | null;
  waveformData: Uint8Array | null;
  isActive: boolean;
  averageFrequency: number;
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
}

interface UseAudioVisualizerOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
}

export const useAudioVisualizer = (
  audioElement: HTMLAudioElement | null,
  isPlaying: boolean,
  options: UseAudioVisualizerOptions = {}
) => {
  const { fftSize = 256, smoothingTimeConstant = 0.8 } = options;
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const connectedElementRef = useRef<HTMLAudioElement | null>(null);
  
  const [data, setData] = useState<VisualizerData>({
    frequencyData: null,
    waveformData: null,
    isActive: false,
    averageFrequency: 0,
    bassLevel: 0,
    midLevel: 0,
    trebleLevel: 0,
  });

  // Initialize audio context and analyser
  const initialize = useCallback(() => {
    if (!audioElement || connectedElementRef.current === audioElement) return;

    try {
      // Create audio context if needed
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
      }

      const audioContext = audioContextRef.current;

      // Create analyser if needed
      if (!analyserRef.current) {
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = smoothingTimeConstant;
        analyserRef.current = analyser;
      }

      // Connect source only if it's a new audio element
      if (connectedElementRef.current !== audioElement) {
        // Clean up old source
        if (sourceRef.current) {
          try {
            sourceRef.current.disconnect();
          } catch (e) {
            // Source might already be disconnected
          }
        }

        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContext.destination);
        sourceRef.current = source;
        connectedElementRef.current = audioElement;
      }

      setData(prev => ({ ...prev, isActive: true }));
    } catch (error) {
      console.error('[useAudioVisualizer] Initialization error:', error);
    }
  }, [audioElement, fftSize, smoothingTimeConstant]);

  // Analyze audio data
  const analyze = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const waveformData = new Uint8Array(bufferLength);

    const tick = () => {
      animationRef.current = requestAnimationFrame(tick);
      
      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(waveformData);

      // Calculate frequency bands
      const bassEnd = Math.floor(bufferLength * 0.1);
      const midEnd = Math.floor(bufferLength * 0.5);

      let bassSum = 0;
      let midSum = 0;
      let trebleSum = 0;
      let totalSum = 0;

      for (let i = 0; i < bufferLength; i++) {
        totalSum += frequencyData[i];
        if (i < bassEnd) {
          bassSum += frequencyData[i];
        } else if (i < midEnd) {
          midSum += frequencyData[i];
        } else {
          trebleSum += frequencyData[i];
        }
      }

      setData({
        frequencyData: new Uint8Array(frequencyData),
        waveformData: new Uint8Array(waveformData),
        isActive: true,
        averageFrequency: totalSum / bufferLength / 255,
        bassLevel: bassSum / bassEnd / 255,
        midLevel: midSum / (midEnd - bassEnd) / 255,
        trebleLevel: trebleSum / (bufferLength - midEnd) / 255,
      });
    };

    tick();
  }, []);

  // Handle audio context state
  useEffect(() => {
    if (audioElement && isPlaying) {
      initialize();
      
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      analyze();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      setData(prev => ({ ...prev, isActive: false }));
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioElement, isPlaying, initialize, analyze]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return data;
};
