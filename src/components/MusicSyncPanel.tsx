import { useState } from 'react';
import { 
  Radio, Users, Copy, LogOut, X, Loader2, 
  CheckCircle, Wifi, WifiOff, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useMusicSyncContext } from '@/contexts/MusicSyncContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MusicSyncPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MusicSyncPanel = ({ isOpen, onClose }: MusicSyncPanelProps) => {
  const { user } = useAuth();
  const {
    session,
    participants,
    isHost,
    isConnected,
    isSyncing,
    isSyncActive,
    startSyncSession,
    joinSyncSession,
    leaveSyncSession,
    endSyncSession,
    syncKey,
    participantCount,
  } = useMusicSyncContext();

  const [joinKey, setJoinKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateSession = async () => {
    if (!user) {
      toast.error('Please sign in to create a sync session');
      return;
    }

    setIsCreating(true);
    await startSyncSession();
    setIsCreating(false);
  };

  const handleJoinSession = async () => {
    if (!joinKey.trim()) {
      toast.error('Please enter a sync key');
      return;
    }

    setIsJoining(true);
    const success = await joinSyncSession(joinKey.trim(), displayName || undefined);
    setIsJoining(false);

    if (success) {
      setJoinKey('');
      setDisplayName('');
    }
  };

  const handleCopyKey = () => {
    if (syncKey) {
      navigator.clipboard.writeText(syncKey);
      setCopied(true);
      toast.success('Sync key copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeave = async () => {
    if (isHost) {
      await endSyncSession();
    } else {
      await leaveSyncSession();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary animate-pulse" />
            Music Sync
          </DialogTitle>
          <DialogDescription>
            Listen together with friends in perfect sync
          </DialogDescription>
        </DialogHeader>

        {isSyncActive && session ? (
          // Active session view
          <div className="space-y-4">
            {/* Sync Key Display */}
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Sync Key</span>
                <Badge variant={isConnected ? 'default' : 'secondary'}>
                  {isConnected ? (
                    <><Wifi className="w-3 h-3 mr-1" /> Connected</>
                  ) : (
                    <><WifiOff className="w-3 h-3 mr-1" /> Connecting...</>
                  )}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-2xl font-mono font-bold text-primary tracking-wider">
                  {syncKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyKey}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Current Song */}
            {session.currentVideo && (
              <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                <img
                  src={session.currentVideo.thumbnail}
                  alt={session.currentVideo.title}
                  className="w-12 h-12 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">
                    {session.currentVideo.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {session.currentVideo.channelTitle}
                  </p>
                </div>
                {session.isPlaying && (
                  <div className="flex gap-0.5">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary rounded-full animate-pulse"
                        style={{
                          height: `${8 + Math.random() * 8}px`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Participants */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Listeners ({participantCount})
                </span>
                {isHost && (
                  <Badge variant="outline" className="text-xs">
                    <Crown className="w-3 h-3 mr-1" /> Host
                  </Badge>
                )}
              </div>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            participant.status === 'connected' ? 'bg-green-500' :
                            participant.status === 'syncing' ? 'bg-yellow-500 animate-pulse' :
                            'bg-red-500'
                          )}
                        />
                        <span className="text-sm font-medium">
                          {participant.displayName || 'Anonymous'}
                        </span>
                        {participant.isHost && (
                          <Crown className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {participant.latencyMs}ms
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Leave/End Button */}
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLeave}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {isHost ? 'End Session' : 'Leave Session'}
            </Button>
          </div>
        ) : (
          // Create/Join view
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Session</TabsTrigger>
              <TabsTrigger value="join">Join Session</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 mt-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Radio className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Start a sync session and share the key with friends to listen together
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleCreateSession}
                disabled={isCreating || !user}
              >
                {isCreating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Radio className="w-4 h-4 mr-2" /> Start Sync Session</>
                )}
              </Button>

              {!user && (
                <p className="text-xs text-center text-muted-foreground">
                  Sign in to create a sync session
                </p>
              )}
            </TabsContent>

            <TabsContent value="join" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Sync Key
                  </label>
                  <Input
                    placeholder="XT-XXXXXX"
                    value={joinKey}
                    onChange={(e) => setJoinKey(e.target.value.toUpperCase())}
                    className="font-mono text-center text-lg tracking-wider"
                    maxLength={9}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Display Name (optional)
                  </label>
                  <Input
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleJoinSession}
                disabled={isJoining || !joinKey.trim()}
              >
                {isJoining ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining...</>
                ) : (
                  <><Users className="w-4 h-4 mr-2" /> Join Session</>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MusicSyncPanel;
