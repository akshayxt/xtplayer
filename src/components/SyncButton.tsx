import { useState } from 'react';
import { Radio, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useMusicSyncContext } from '@/contexts/MusicSyncContext';
import MusicSyncPanelAdvanced from './MusicSyncPanelAdvanced';
import { cn } from '@/lib/utils';

const SyncButton = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { isSyncActive, isConnected, participantCount, isHost } = useMusicSyncContext();

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPanelOpen(true)}
              className={cn(
                "relative",
                isSyncActive && "text-primary"
              )}
            >
              <Radio className={cn(
                "w-5 h-5",
                isSyncActive && isConnected && "animate-pulse"
              )} />
              {isSyncActive && participantCount > 1 && (
                <Badge 
                  variant="default" 
                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                >
                  {participantCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isSyncActive ? (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{participantCount} listening</span>
                {isHost && <span className="text-yellow-500">(Host)</span>}
              </div>
            ) : (
              'Music Sync'
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <MusicSyncPanelAdvanced 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
      />
    </>
  );
};

export default SyncButton;
