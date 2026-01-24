// Keyboard Shortcuts Help Modal
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { category: 'Playback', items: [
    { keys: ['Space'], action: 'Play / Pause' },
    { keys: ['M'], action: 'Mute / Unmute' },
    { keys: ['N'], action: 'Next track' },
    { keys: ['P'], action: 'Previous track' },
  ]},
  { category: 'Seeking', items: [
    { keys: ['←'], action: 'Seek backward 5s' },
    { keys: ['→'], action: 'Seek forward 5s' },
    { keys: ['J'], action: 'Seek backward 10s' },
    { keys: ['L'], action: 'Seek forward 10s' },
    { keys: ['0-9'], action: 'Seek to percentage' },
    { keys: ['Home'], action: 'Go to start' },
    { keys: ['End'], action: 'Go to end' },
  ]},
  { category: 'Volume', items: [
    { keys: ['↑'], action: 'Increase volume' },
    { keys: ['↓'], action: 'Decrease volume' },
  ]},
  { category: 'Queue & Playback Mode', items: [
    { keys: ['S'], action: 'Toggle shuffle' },
    { keys: ['R'], action: 'Cycle repeat mode' },
    { keys: ['A'], action: 'Toggle autoplay' },
  ]},
];

const KeyboardShortcutsHelp = ({ isOpen, onClose }: KeyboardShortcutsHelpProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative glass-effect rounded-2xl border border-border w-full max-w-lg mx-4 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-foreground">Keyboard Shortcuts</h2>
              <p className="text-sm text-muted-foreground">Control playback with your keyboard</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-medium text-primary mb-3">{section.category}</h3>
              <div className="space-y-2">
                {section.items.map((shortcut, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm text-foreground">{shortcut.action}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, j) => (
                        <kbd
                          key={j}
                          className={cn(
                            "inline-flex items-center justify-center min-w-[28px] h-7 px-2",
                            "rounded-md border border-border bg-muted",
                            "text-xs font-medium text-foreground",
                            "shadow-sm"
                          )}
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Shortcuts are disabled when typing in input fields
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
