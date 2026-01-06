import { useState } from 'react';
import { Search, Menu, Settings, Play, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import SettingsPanel from './SettingsPanel';

interface HeaderProps {
  onSearch: (query: string) => void;
  searchQuery: string;
}

const Header = ({ onSearch, searchQuery }: HeaderProps) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      onSearch(localQuery.trim());
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-effect">
      <div className="container flex h-16 items-center justify-between gap-4 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Play className="w-5 h-5 text-primary-foreground fill-current" />
          </div>
          <span className="font-bold text-lg hidden sm:inline">
            <span className="gradient-text">XT</span> Builds
          </span>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search videos..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              className="pl-10 pr-4 bg-secondary border-0 focus-visible:ring-primary"
            />
          </div>
        </form>

        {/* Settings */}
        <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Settings className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-card border-border">
            <SheetHeader>
              <SheetTitle className="text-foreground">Settings</SheetTitle>
            </SheetHeader>
            <SettingsPanel onClose={() => setIsSettingsOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
