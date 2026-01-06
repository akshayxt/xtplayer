import { useState } from 'react';
import { Key, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useApiKey } from '@/contexts/ApiKeyContext';
import { useToast } from '@/hooks/use-toast';

interface SettingsPanelProps {
  onClose: () => void;
}

const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const { apiKey, setApiKey, isApiKeySet } = useApiKey();
  const [localKey, setLocalKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
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

  return (
    <div className="mt-8 space-y-6">
      {/* API Key Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <Key className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">YouTube API Key</h3>
        </div>

        <div className="p-4 rounded-lg bg-secondary/50 space-y-4">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              Enter your YouTube Data API v3 key to enable video search and playback.
              Get one from the{' '}
              <a
                href="https://console.developers.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
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
                className="pr-10 bg-background border-border"
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
            <Button onClick={handleSave} className="flex-1" disabled={!localKey.trim()}>
              <Check className="w-4 h-4 mr-2" />
              Save Key
            </Button>
            {isApiKeySet && (
              <Button variant="destructive" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>

          {isApiKeySet && (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <Check className="w-4 h-4" />
              <span>API key is configured</span>
            </div>
          )}
        </div>
      </div>

      {/* About Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">About</h3>
        <div className="p-4 rounded-lg bg-secondary/50 space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="gradient-text font-bold">XT Builds</span> - Premium Music Experience
          </p>
          <p>Background audio playback for uninterrupted listening.</p>
          <p className="text-xs">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
