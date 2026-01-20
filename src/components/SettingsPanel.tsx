import { useState } from 'react';
import { Key, Eye, EyeOff, Check, AlertCircle, Palette, User, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useApiKey } from '@/contexts/ApiKeyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppMode } from '@/contexts/AppModeContext';
import { useToast } from '@/hooks/use-toast';
import ThemeSwitcher from './ThemeSwitcher';
import ModeSwitcher from './ModeSwitcher';
import AuthModal from './AuthModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SettingsPanelProps {
  onClose: () => void;
}

const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const { apiKey, setApiKey, isApiKeySet } = useApiKey();
  const { user, profile, signOut } = useAuth();
  const { mode } = useAppMode();
  const [localKey, setLocalKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    if (localKey.trim()) {
      setApiKey(localKey.trim());
      toast({
        title: 'API Key Updated',
        description: 'Your YouTube API key has been saved successfully.',
      });
    }
  };

  const handleClear = () => {
    setLocalKey('');
    setApiKey('');
    toast({
      title: 'API Key Removed',
      description: 'Your YouTube API key has been cleared.',
      variant: 'destructive',
    });
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Signed Out',
      description: 'You have been signed out successfully.',
    });
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Account Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <User className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Account</h3>
        </div>
        
        {user ? (
          <div className="p-4 rounded-xl bg-secondary/50 space-y-4 border border-border/50">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {profile?.display_name || 'User'}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-secondary/50 space-y-4 border border-border/50">
            <p className="text-sm text-muted-foreground">
              Sign in to access YT Music mode, sync your library, and more.
            </p>
            <Button
              className="w-full"
              onClick={() => setShowAuthModal(true)}
            >
              Sign In / Sign Up
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Mode Switcher */}
      <ModeSwitcher onNeedAuth={() => setShowAuthModal(true)} />

      <Separator />

      {/* Theme Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Appearance</h3>
        </div>
        <ThemeSwitcher />
      </div>

      <Separator />

      {/* API Key Section - Only show in API mode */}
      {mode === 'api' && (
        <>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-foreground">
              <Key className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">YouTube API Key</h3>
            </div>

            <div className="p-4 rounded-xl bg-secondary/50 space-y-4 border border-border/50">
              <div className="flex items-start gap-2 text-sm text-warning bg-warning/10 p-3 rounded-lg border border-warning/20">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  <strong>Security Notice:</strong> API keys stored in your browser are visible in DevTools and could be exposed if this site has vulnerabilities. For better security, consider using YT Music mode instead.
                </p>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  Enter your YouTube Data API v3 key to enable video search and playback.
                  Get one from the{' '}
                  <a
                    href="https://console.developers.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline transition-colors"
                  >
                    Google Cloud Console
                  </a>
                  .
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-foreground">
                  API Key
                </Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showKey ? 'text' : 'password'}
                    value={localKey}
                    onChange={(e) => setLocalKey(e.target.value)}
                    placeholder="Enter your API key..."
                    className="pr-10 bg-background border-border input-animated"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  className="flex-1 btn-press"
                  disabled={!localKey.trim()}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Key
                </Button>
                {isApiKeySet && (
                  <Button variant="destructive" onClick={handleClear} className="btn-press">
                    Clear
                  </Button>
                )}
              </div>

              {isApiKeySet && (
                <div className="flex items-center gap-2 text-sm text-primary animate-fade-in">
                  <Check className="w-4 h-4" />
                  <span>API key is configured</span>
                </div>
              )}
            </div>
          </div>

          <Separator />
        </>
      )}

      {/* About Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">About</h3>
        <div className="p-4 rounded-xl bg-secondary/50 space-y-2 text-sm text-muted-foreground border border-border/50">
          <p>
            <span className="gradient-text font-bold">XT Builds</span> - Premium Music Experience
          </p>
          <p>Background audio playback with premium UI motion system.</p>
          <p className="text-xs opacity-60">Version 2.1.0 • Cloud Sync</p>
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};

export default SettingsPanel;
