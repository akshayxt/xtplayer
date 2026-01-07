import { useState, useEffect } from 'react';
import { Search, Settings, Play } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import SettingsPanel from './SettingsPanel';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onSearch: (query: string) => void;
  searchQuery: string;
}

const Header = ({ onSearch, searchQuery }: HeaderProps) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll detection for navbar animation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      onSearch(localQuery.trim());
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-[var(--transition-normal)]",
        "glass-effect",
        isScrolled ? "py-2 shadow-lg" : "py-4"
      )}
      style={{ transitionTimingFunction: 'var(--ease-smooth)' }}
    >
      <div className="container flex items-center justify-between gap-4 px-4">
        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-2 shrink-0 transition-all duration-[var(--transition-normal)]",
            isScrolled ? "scale-90" : "scale-100"
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow hover-scale">
            <Play className="w-5 h-5 text-primary-foreground fill-current" />
          </div>
          <span className="font-bold text-lg hidden sm:inline">
            <span className="gradient-text">XT</span> Builds
          </span>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="flex-1 max-w-2xl">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              type="text"
              placeholder="Search videos..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              className={cn(
                "pl-10 pr-4 bg-secondary border-0 input-animated",
                "focus-visible:ring-primary focus-visible:ring-offset-0",
                "transition-all duration-[var(--transition-fast)]"
              )}
            />
          </div>
        </form>

        {/* Settings */}
        <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 hover-scale active:scale-95 transition-transform duration-[var(--transition-fast)]"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-card border-border overflow-y-auto">
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
