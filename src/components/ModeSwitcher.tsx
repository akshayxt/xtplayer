import { useAppMode } from '@/contexts/AppModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Zap, Music2, Lock } from 'lucide-react';

interface ModeSwitcherProps {
  onNeedAuth?: () => void;
}

const ModeSwitcher = ({ onNeedAuth }: ModeSwitcherProps) => {
  const { mode, setMode } = useAppMode();
  const { user } = useAuth();

  const handleModeChange = (newMode: 'api' | 'ytmusic') => {
    if (newMode === 'ytmusic' && !user) {
      onNeedAuth?.();
      return;
    }
    setMode(newMode);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">App Mode</h3>
      <div className="grid grid-cols-2 gap-3">
        {/* API Mode */}
        <button
          onClick={() => handleModeChange('api')}
          className={cn(
            "relative p-4 rounded-xl border-2 transition-all duration-200",
            "hover:border-primary/50 hover-lift",
            mode === 'api'
              ? "border-primary bg-primary/10"
              : "border-border bg-card"
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              mode === 'api' ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Zap className="w-6 h-6" />
            </div>
            <span className="font-medium text-sm">API Mode</span>
            <span className="text-xs text-muted-foreground text-center">
              YouTube Data API
            </span>
          </div>
          {mode === 'api' && (
            <Badge className="absolute top-2 right-2 text-[10px]">Active</Badge>
          )}
        </button>

        {/* YT Music Mode */}
        <button
          onClick={() => handleModeChange('ytmusic')}
          className={cn(
            "relative p-4 rounded-xl border-2 transition-all duration-200",
            "hover:border-primary/50 hover-lift",
            mode === 'ytmusic'
              ? "border-primary bg-primary/10"
              : "border-border bg-card"
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              mode === 'ytmusic' ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Music2 className="w-6 h-6" />
            </div>
            <span className="font-medium text-sm">YT Music</span>
            <span className="text-xs text-muted-foreground text-center">
              {user ? 'Full features' : 'Login required'}
            </span>
          </div>
          {mode === 'ytmusic' && (
            <Badge className="absolute top-2 right-2 text-[10px]">Active</Badge>
          )}
          {!user && mode !== 'ytmusic' && (
            <Lock className="absolute top-2 right-2 w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {mode === 'api' 
          ? 'Using YouTube Data API with your API key'
          : 'Using YT Music features with cloud sync'}
      </p>
    </div>
  );
};

export default ModeSwitcher;
