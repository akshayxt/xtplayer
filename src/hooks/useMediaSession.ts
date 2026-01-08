import { useEffect, useCallback } from 'react';

interface MediaSessionConfig {
  title: string;
  artist: string;
  artwork: string;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek?: (time: number) => void;
  duration?: number;
  position?: number;
}

export const useMediaSession = ({
  title,
  artist,
  artwork,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  duration,
  position,
}: MediaSessionConfig) => {
  // Update media session metadata
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: 'XT Builds',
      artwork: [
        { src: artwork, sizes: '96x96', type: 'image/png' },
        { src: artwork, sizes: '128x128', type: 'image/png' },
        { src: artwork, sizes: '192x192', type: 'image/png' },
        { src: artwork, sizes: '256x256', type: 'image/png' },
        { src: artwork, sizes: '384x384', type: 'image/png' },
        { src: artwork, sizes: '512x512', type: 'image/png' },
      ],
    });
  }, [title, artist, artwork]);

  // Update playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Update position state
  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: 1,
        position: position || 0,
      });
    } catch (e) {
      // Position state may not be supported
    }
  }, [duration, position]);

  // Set up action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', onPlay],
      ['pause', onPause],
      ['nexttrack', onNext],
      ['previoustrack', onPrevious],
    ];

    if (onSeek) {
      handlers.push(['seekto', (details) => {
        if (details.seekTime !== undefined) {
          onSeek(details.seekTime);
        }
      }]);
    }

    handlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (e) {
        console.log(`Media Session action "${action}" not supported`);
      }
    });

    return () => {
      handlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    };
  }, [onPlay, onPause, onNext, onPrevious, onSeek]);
};
