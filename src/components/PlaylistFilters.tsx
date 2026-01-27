import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { PLATFORM_INFO, type Platform, type FilterOptions } from '@/types/playlist';

interface PlaylistFiltersProps {
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
}

const PlaylistFilters = ({ filters, setFilters }: PlaylistFiltersProps) => {
  const platforms = Object.entries(PLATFORM_INFO).filter(([key]) => !['local', 'manual'].includes(key));

  const togglePlatform = (platform: Platform) => {
    const current = filters.platforms || [];
    const updated = current.includes(platform)
      ? current.filter(p => p !== platform)
      : [...current, platform];
    setFilters({ ...filters, platforms: updated.length > 0 ? updated : undefined });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(v => 
    v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
  );

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Filters</h4>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="space-y-1">
        <Label className="text-xs">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, artist, album..."
            value={filters.searchQuery || ''}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value || undefined })}
            className="pl-9"
          />
        </div>
      </div>

      {/* Regex */}
      <div className="space-y-1">
        <Label className="text-xs">Regex Pattern</Label>
        <Input
          placeholder="^The.*"
          value={filters.regex || ''}
          onChange={(e) => setFilters({ ...filters, regex: e.target.value || undefined })}
          className="font-mono text-sm"
        />
      </div>

      {/* Platform filter */}
      <div className="space-y-1">
        <Label className="text-xs">Platforms</Label>
        <div className="flex flex-wrap gap-1">
          {platforms.map(([key, info]) => {
            const platform = key as Platform;
            const isActive = filters.platforms?.includes(platform);
            return (
              <Badge
                key={key}
                variant={isActive ? 'default' : 'outline'}
                className="cursor-pointer transition-colors"
                style={{ 
                  backgroundColor: isActive ? info.color : undefined,
                  borderColor: info.color,
                }}
                onClick={() => togglePlatform(platform)}
              >
                {info.icon} {info.name}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Duration range */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Min Duration (sec)</Label>
          <Input
            type="number"
            placeholder="0"
            value={filters.minDuration || ''}
            onChange={(e) => setFilters({ 
              ...filters, 
              minDuration: e.target.value ? parseInt(e.target.value) : undefined 
            })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max Duration (sec)</Label>
          <Input
            type="number"
            placeholder="600"
            value={filters.maxDuration || ''}
            onChange={(e) => setFilters({ 
              ...filters, 
              maxDuration: e.target.value ? parseInt(e.target.value) : undefined 
            })}
          />
        </div>
      </div>

      {/* Year range */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Year From</Label>
          <Input
            type="number"
            placeholder="1950"
            value={filters.years?.min || ''}
            onChange={(e) => setFilters({ 
              ...filters, 
              years: { 
                ...filters.years,
                min: e.target.value ? parseInt(e.target.value) : undefined 
              }
            })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Year To</Label>
          <Input
            type="number"
            placeholder="2025"
            value={filters.years?.max || ''}
            onChange={(e) => setFilters({ 
              ...filters, 
              years: { 
                ...filters.years,
                max: e.target.value ? parseInt(e.target.value) : undefined 
              }
            })}
          />
        </div>
      </div>

      {/* Explicit filter */}
      <div className="flex items-center gap-2">
        <Label className="text-xs">Explicit Content</Label>
        <div className="flex gap-1">
          <Badge
            variant={filters.explicit === true ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilters({ 
              ...filters, 
              explicit: filters.explicit === true ? null : true 
            })}
          >
            Explicit Only
          </Badge>
          <Badge
            variant={filters.explicit === false ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilters({ 
              ...filters, 
              explicit: filters.explicit === false ? null : false 
            })}
          >
            Clean Only
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default PlaylistFilters;
