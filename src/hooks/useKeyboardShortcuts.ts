// Keyboard shortcuts hook for playback control
import { useEffect, useCallback } from 'react';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { toast } from 'sonner';

interface ShortcutConfig {
  enabled: boolean;
  showToasts: boolean;
}

const defaultConfig: ShortcutConfig = {
  enabled: true,
  showToasts: true,
};

export const useKeyboardShortcuts = (config: Partial<ShortcutConfig> = {}) => {
  const { enabled, showToasts } = { ...defaultConfig, ...config };
  
  const {
    isPlaying,
    isMuted,
    volume,
    currentVideo,
    pause,
    resume,
    seek,
    progress,
    duration,
    setVolume,
    toggleMute,
    playNext,
    playPrevious,
    toggleShuffle,
    isShuffle,
    repeatMode,
    setRepeatMode,
    toggleAutoplay,
    isAutoplay,
  } = useAudioPlayer();

  const showShortcutToast = useCallback((message: string) => {
    if (showToasts) {
      toast(message, { duration: 1500 });
    }
  }, [showToasts]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Don't trigger if modifiers are pressed (except Shift for some)
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    switch (e.key.toLowerCase()) {
      // Space - Play/Pause
      case ' ':
        e.preventDefault();
        if (currentVideo) {
          if (isPlaying) {
            pause();
            showShortcutToast('⏸️ Paused');
          } else {
            resume();
            showShortcutToast('▶️ Playing');
          }
        }
        break;

      // M - Mute/Unmute
      case 'm':
        e.preventDefault();
        toggleMute();
        showShortcutToast(isMuted ? '🔊 Unmuted' : '🔇 Muted');
        break;

      // Arrow Left - Seek backward 5 seconds
      case 'arrowleft':
        e.preventDefault();
        if (currentVideo && duration > 0) {
          const newTime = Math.max(0, progress - 5);
          seek(newTime);
          showShortcutToast(`⏪ -5s`);
        }
        break;

      // Arrow Right - Seek forward 5 seconds
      case 'arrowright':
        e.preventDefault();
        if (currentVideo && duration > 0) {
          const newTime = Math.min(duration, progress + 5);
          seek(newTime);
          showShortcutToast(`⏩ +5s`);
        }
        break;

      // Arrow Up - Volume up
      case 'arrowup':
        e.preventDefault();
        const newVolumeUp = Math.min(100, volume + 10);
        setVolume(newVolumeUp);
        showShortcutToast(`🔊 Volume ${newVolumeUp}%`);
        break;

      // Arrow Down - Volume down
      case 'arrowdown':
        e.preventDefault();
        const newVolumeDown = Math.max(0, volume - 10);
        setVolume(newVolumeDown);
        showShortcutToast(`🔉 Volume ${newVolumeDown}%`);
        break;

      // N - Next track
      case 'n':
        e.preventDefault();
        playNext();
        showShortcutToast('⏭️ Next track');
        break;

      // P - Previous track
      case 'p':
        e.preventDefault();
        playPrevious();
        showShortcutToast('⏮️ Previous track');
        break;

      // S - Toggle shuffle
      case 's':
        e.preventDefault();
        toggleShuffle();
        showShortcutToast(isShuffle ? '🔀 Shuffle off' : '🔀 Shuffle on');
        break;

      // R - Cycle repeat mode
      case 'r':
        e.preventDefault();
        const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all'];
        const currentIndex = modes.indexOf(repeatMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        setRepeatMode(nextMode);
        const modeLabels = { off: '🔁 Repeat off', one: '🔂 Repeat one', all: '🔁 Repeat all' };
        showShortcutToast(modeLabels[nextMode]);
        break;

      // A - Toggle autoplay
      case 'a':
        e.preventDefault();
        toggleAutoplay();
        showShortcutToast(isAutoplay ? '📻 Autoplay off' : '📻 Autoplay on');
        break;

      // 0-9 - Seek to percentage
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        e.preventDefault();
        if (currentVideo && duration > 0) {
          const percentage = parseInt(e.key) * 10;
          const targetTime = (duration * percentage) / 100;
          seek(targetTime);
          showShortcutToast(`⏩ ${percentage}%`);
        }
        break;

      // J - Seek backward 10 seconds
      case 'j':
        e.preventDefault();
        if (currentVideo && duration > 0) {
          const newTime = Math.max(0, progress - 10);
          seek(newTime);
          showShortcutToast(`⏪ -10s`);
        }
        break;

      // L - Seek forward 10 seconds
      case 'l':
        e.preventDefault();
        if (currentVideo && duration > 0) {
          const newTime = Math.min(duration, progress + 10);
          seek(newTime);
          showShortcutToast(`⏩ +10s`);
        }
        break;

      // Home - Go to beginning
      case 'home':
        e.preventDefault();
        if (currentVideo) {
          seek(0);
          showShortcutToast('⏮️ Start');
        }
        break;

      // End - Go to end (triggers next track)
      case 'end':
        e.preventDefault();
        if (currentVideo && duration > 0) {
          seek(duration - 1);
          showShortcutToast('⏭️ End');
        }
        break;

      default:
        break;
    }
  }, [
    currentVideo,
    isPlaying,
    isMuted,
    volume,
    progress,
    duration,
    pause,
    resume,
    seek,
    setVolume,
    toggleMute,
    playNext,
    playPrevious,
    toggleShuffle,
    isShuffle,
    repeatMode,
    setRepeatMode,
    toggleAutoplay,
    isAutoplay,
    showShortcutToast,
  ]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: [
      { key: 'Space', action: 'Play/Pause' },
      { key: 'M', action: 'Mute/Unmute' },
      { key: '←/→', action: 'Seek ±5s' },
      { key: 'J/L', action: 'Seek ±10s' },
      { key: '↑/↓', action: 'Volume ±10%' },
      { key: 'N', action: 'Next track' },
      { key: 'P', action: 'Previous track' },
      { key: 'S', action: 'Toggle shuffle' },
      { key: 'R', action: 'Cycle repeat' },
      { key: 'A', action: 'Toggle autoplay' },
      { key: '0-9', action: 'Seek to %' },
      { key: 'Home', action: 'Go to start' },
      { key: 'End', action: 'Go to end' },
    ],
  };
};

export default useKeyboardShortcuts;
