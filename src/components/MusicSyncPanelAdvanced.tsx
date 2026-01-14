import { useState, useEffect } from 'react';
import { 
  Radio, Users, Copy, LogOut, X, Loader2, 
  CheckCircle, Wifi, WifiOff, Crown, Lock, Unlock,
  MessageCircle, ThumbsUp, Plus, Trash2, Play, SkipForward,
  QrCode, Share2, Settings, UserPlus, UserMinus
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
import { useAudioPlayer, Video } from '@/contexts/AudioPlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MusicSyncPanelAdvancedProps {
  isOpen: boolean;
  onClose: () => void;
}

const MusicSyncPanelAdvanced = ({ isOpen, onClose }: MusicSyncPanelAdvancedProps) => {
  const { user, profile } = useAuth();
  const { autoplayQueue } = useAudioPlayer();
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
  const [activeTab, setActiveTab] = useState('session');
  const [chatMessage, setChatMessage] = useState('');

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

  const handleShare = async () => {
    if (!syncKey) return;
    
    const shareUrl = `${window.location.origin}?join=${syncKey}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Music Sync Session',
          text: `Listen together with me! Join code: ${syncKey}`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
        handleCopyKey();
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied!');
    }
  };

  const handleLeave = async () => {
    if (isHost) {
      await endSyncSession();
    } else {
      await leaveSyncSession();
    }
  };

  const reactions = ['🎵', '🔥', '❤️', '👏', '🎉', '😍'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary animate-pulse" />
            Music Sync
            {isSyncActive && (
              <Badge variant="outline" className="ml-2">
                <Users className="w-3 h-3 mr-1" />
                {participantCount}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Listen together with friends in perfect sync
          </DialogDescription>
        </DialogHeader>

        {isSyncActive && session ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Header with sync key */}
            <div className="bg-muted rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Sync Key</span>
                <div className="flex items-center gap-2">
                  <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
                    {isConnected ? (
                      <><Wifi className="w-3 h-3 mr-1" /> Live</>
                    ) : (
                      <><WifiOff className="w-3 h-3 mr-1" /> Connecting</>
                    )}
                  </Badge>
                  {isHost && (
                    <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500/50">
                      <Crown className="w-3 h-3 mr-1" /> Host
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xl font-mono font-bold text-primary tracking-wider">
                  {syncKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyKey}
                  className="shrink-0 h-8 w-8"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShare}
                  className="shrink-0 h-8 w-8"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Current Song */}
            {session.currentVideo && (
              <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg mb-4">
                <img
                  src={session.currentVideo.thumbnail}
                  alt={session.currentVideo.title}
                  className="w-14 h-14 rounded-lg object-cover"
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
                  <div className="flex gap-0.5 items-end h-6">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary rounded-full animate-pulse origin-bottom"
                        style={{
                          height: `${12 + Math.random() * 12}px`,
                          animationDelay: `${i * 0.1}s`,
                          animationDuration: '0.5s',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tabs: Session / Queue / Chat */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3 mb-2">
                <TabsTrigger value="session" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Listeners
                </TabsTrigger>
                <TabsTrigger value="queue" className="text-xs">
                  <Play className="w-3 h-3 mr-1" />
                  Queue
                </TabsTrigger>
                <TabsTrigger value="chat" className="text-xs">
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Chat
                </TabsTrigger>
              </TabsList>

              <TabsContent value="session" className="flex-1 overflow-hidden mt-0">
                <ScrollArea className="h-48">
                  <div className="space-y-2 p-1">
                    {participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                              {(participant.displayName || 'G')[0].toUpperCase()}
                            </div>
                            <div
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background",
                                participant.status === 'connected' ? 'bg-green-500' :
                                participant.status === 'syncing' ? 'bg-yellow-500 animate-pulse' :
                                'bg-red-500'
                              )}
                            />
                          </div>
                          <div>
                            <span className="text-sm font-medium flex items-center gap-1.5">
                              {participant.displayName || 'Anonymous'}
                              {participant.isHost && (
                                <Crown className="w-3 h-3 text-yellow-500" />
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {participant.latencyMs}ms latency
                            </span>
                          </div>
                        </div>
                        {isHost && !participant.isHost && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                            <UserMinus className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="queue" className="flex-1 overflow-hidden mt-0">
                <ScrollArea className="h-48">
                  <div className="space-y-2 p-1">
                    {autoplayQueue.length > 0 ? (
                      autoplayQueue.slice(0, 10).map((video, index) => (
                        <div
                          key={video.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{video.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{video.channelTitle}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Queue is empty</p>
                        <p className="text-xs">Songs will appear as they're added</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="chat" className="flex-1 overflow-hidden mt-0 flex flex-col">
                <ScrollArea className="flex-1 h-32">
                  <div className="space-y-2 p-1">
                    <div className="text-center py-4 text-muted-foreground">
                      <MessageCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Chat with your listening party</p>
                    </div>
                  </div>
                </ScrollArea>
                
                {/* Reactions */}
                <div className="flex gap-1 justify-center py-2 border-t border-border/50">
                  {reactions.map((emoji) => (
                    <button
                      key={emoji}
                      className="text-lg hover:scale-125 transition-transform p-1"
                      onClick={() => toast(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Chat input */}
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Send a message..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="text-sm h-9"
                  />
                  <Button size="sm" className="h-9 px-3">
                    Send
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Leave/End Button */}
            <Button
              variant="destructive"
              className="w-full mt-4"
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
              <div className="text-center space-y-3">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Radio className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Start a Sync Session</h3>
                  <p className="text-sm text-muted-foreground">
                    Share the code with friends to listen together in real-time
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-lg bg-muted/50">
                  <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium">Up to 30</p>
                  <p className="text-xs text-muted-foreground">Listeners</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <Wifi className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium">&lt;100ms</p>
                  <p className="text-xs text-muted-foreground">Sync Accuracy</p>
                </div>
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
                  <label className="text-sm font-medium mb-1.5 block">
                    Sync Key
                  </label>
                  <Input
                    placeholder="XT-XXXXXX"
                    value={joinKey}
                    onChange={(e) => setJoinKey(e.target.value.toUpperCase())}
                    className="font-mono text-center text-lg tracking-wider h-12"
                    maxLength={9}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Your Name (optional)
                  </label>
                  <Input
                    placeholder="Enter your display name"
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

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button variant="outline" className="w-full" disabled>
                <QrCode className="w-4 h-4 mr-2" />
                Scan QR Code
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MusicSyncPanelAdvanced;
