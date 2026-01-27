import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Link, Loader2, Upload, FileText, Search, Check, X, 
  Download, Filter, ArrowUpDown, Music, Shuffle,
  CheckSquare, Square, RotateCcw, AlertCircle
} from 'lucide-react';
import { usePlaylistImport } from '@/hooks/usePlaylistImport';
import { useUserPlaylists } from '@/hooks/useUserPlaylists';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { PLATFORM_INFO, type SortMode, type NormalizedTrack } from '@/types/playlist';
import PlaylistTrackItem from './PlaylistTrackItem';
import PlaylistFilters from './PlaylistFilters';

interface UniversalPlaylistImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (playlistId: string) => void;
}

const UniversalPlaylistImport = ({ isOpen, onClose, onImportComplete }: UniversalPlaylistImportProps) => {
  const { user } = useAuth();
  const { createPlaylist, addSongToPlaylist } = useUserPlaylists();
  const {
    result,
    tracks,
    selectedTracks,
    isLoading,
    error,
    importFromUrl,
    importFromFile,
    importFromManual,
    toggleTrackSelection,
    selectAll,
    deselectAll,
    invertSelection,
    sortMode,
    setSortMode,
    filters,
    setFilters,
    filteredTracks,
    exportToFile,
    reset,
  } = usePlaylistImport();

  const [activeTab, setActiveTab] = useState('url');
  const [inputUrl, setInputUrl] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportUrl = async () => {
    if (!inputUrl.trim()) return;
    await importFromUrl(inputUrl.trim());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const format = file.name.split('.').pop()?.toLowerCase() as 'json' | 'csv' | 'm3u' | 'txt';
    if (!['json', 'csv', 'm3u', 'txt'].includes(format)) {
      return;
    }

    const content = await file.text();
    await importFromFile(content, format);
  };

  const handleManualImport = async () => {
    if (!manualInput.trim()) return;
    await importFromManual(manualInput.trim());
  };

  const handleSaveToPlaylist = async () => {
    if (!user) return;
    if (selectedTracks.length === 0) return;

    setIsSaving(true);
    try {
      const name = playlistName.trim() || result?.playlist_name || 'Imported Playlist';
      const playlist = await createPlaylist(name, `Imported from ${result?.playlist_source || 'external source'}`);
      
      if (playlist) {
        for (const track of selectedTracks) {
          await addSongToPlaylist(playlist.id, {
            id: track.id,
            title: track.title,
            artist: track.artist,
            thumbnail: track.thumb_url || '',
            duration: track.duration_ms ? Math.floor(track.duration_ms / 1000) : undefined,
          });
        }
        
        onImportComplete?.(playlist.id);
        handleClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    reset();
    setInputUrl('');
    setManualInput('');
    setPlaylistName('');
    setShowFilters(false);
    setActiveTab('url');
    onClose();
  };

  const hasResults = tracks.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Universal Playlist Import
          </DialogTitle>
        </DialogHeader>

        {!hasResults ? (
          <ImportSourceTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            inputUrl={inputUrl}
            setInputUrl={setInputUrl}
            manualInput={manualInput}
            setManualInput={setManualInput}
            isLoading={isLoading}
            error={error}
            onImportUrl={handleImportUrl}
            onFileUpload={handleFileUpload}
            onManualImport={handleManualImport}
            fileInputRef={fileInputRef}
          />
        ) : (
          <TrackSelectionView
            result={result}
            tracks={tracks}
            filteredTracks={filteredTracks}
            selectedTracks={selectedTracks}
            sortMode={sortMode}
            setSortMode={setSortMode}
            filters={filters}
            setFilters={setFilters}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            toggleTrackSelection={toggleTrackSelection}
            selectAll={selectAll}
            deselectAll={deselectAll}
            invertSelection={invertSelection}
            exportToFile={exportToFile}
            playlistName={playlistName}
            setPlaylistName={setPlaylistName}
            onSave={handleSaveToPlaylist}
            onBack={reset}
            isSaving={isSaving}
            user={user}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

// Import source tabs component
interface ImportSourceTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  inputUrl: string;
  setInputUrl: (url: string) => void;
  manualInput: string;
  setManualInput: (input: string) => void;
  isLoading: boolean;
  error: string | null;
  onImportUrl: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onManualImport: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const ImportSourceTabs = ({
  activeTab,
  setActiveTab,
  inputUrl,
  setInputUrl,
  manualInput,
  setManualInput,
  isLoading,
  error,
  onImportUrl,
  onFileUpload,
  onManualImport,
  fileInputRef,
}: ImportSourceTabsProps) => (
  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
    <TabsList className="grid w-full grid-cols-3">
      <TabsTrigger value="url" className="flex items-center gap-2">
        <Link className="w-4 h-4" />
        URL
      </TabsTrigger>
      <TabsTrigger value="file" className="flex items-center gap-2">
        <Upload className="w-4 h-4" />
        File
      </TabsTrigger>
      <TabsTrigger value="manual" className="flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Manual
      </TabsTrigger>
    </TabsList>

    {/* URL Import */}
    <TabsContent value="url" className="space-y-4 mt-4">
      <div className="space-y-4">
        <SupportedPlatforms />
        
        <div>
          <label className="text-sm font-medium text-foreground">Playlist URL</label>
          <Input
            placeholder="Paste playlist URL from any supported platform..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onImportUrl()}
            className="mt-1"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button onClick={onImportUrl} disabled={!inputUrl.trim() || isLoading} className="w-full">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Link className="w-4 h-4 mr-2" />
          )}
          Import Playlist
        </Button>
      </div>
    </TabsContent>

    {/* File Import */}
    <TabsContent value="file" className="space-y-4 mt-4">
      <div className="space-y-4">
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
          <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            Upload a playlist file
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Supported formats: .json, .csv, .m3u, .txt
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.m3u,.txt"
            onChange={onFileUpload}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Choose File
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            <strong>JSON:</strong> Array of objects with title/artist fields<br />
            <strong>CSV:</strong> Header row with title,artist columns<br />
            <strong>M3U:</strong> Standard M3U playlist format<br />
            <strong>TXT:</strong> One track per line (Artist - Title)
          </p>
        </div>
      </div>
    </TabsContent>

    {/* Manual Import */}
    <TabsContent value="manual" className="space-y-4 mt-4">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground">Enter tracks manually</label>
          <Textarea
            placeholder="Enter one track per line in format:&#10;Artist - Title&#10;Artist - Title&#10;..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            className="mt-1 min-h-[200px] font-mono text-sm"
          />
        </div>

        <Button onClick={onManualImport} disabled={!manualInput.trim() || isLoading} className="w-full">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <FileText className="w-4 h-4 mr-2" />
          )}
          Parse Tracks
        </Button>
      </div>
    </TabsContent>
  </Tabs>
);

// Supported platforms display
const SupportedPlatforms = () => (
  <div className="bg-muted/50 rounded-xl p-4">
    <p className="text-sm font-medium text-foreground mb-3">Supported Platforms</p>
    <div className="grid grid-cols-3 gap-2">
      {Object.entries(PLATFORM_INFO).filter(([key]) => !['local', 'manual'].includes(key)).map(([key, info]) => (
        <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{info.icon}</span>
          <span>{info.name}</span>
        </div>
      ))}
    </div>
  </div>
);

// Track selection view component
interface TrackSelectionViewProps {
  result: ReturnType<typeof usePlaylistImport>['result'];
  tracks: NormalizedTrack[];
  filteredTracks: NormalizedTrack[];
  selectedTracks: NormalizedTrack[];
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  filters: ReturnType<typeof usePlaylistImport>['filters'];
  setFilters: ReturnType<typeof usePlaylistImport>['setFilters'];
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  toggleTrackSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  invertSelection: () => void;
  exportToFile: (format: 'json' | 'csv' | 'm3u' | 'txt', selectedOnly?: boolean) => void;
  playlistName: string;
  setPlaylistName: (name: string) => void;
  onSave: () => void;
  onBack: () => void;
  isSaving: boolean;
  user: any;
}

const TrackSelectionView = ({
  result,
  tracks,
  filteredTracks,
  selectedTracks,
  sortMode,
  setSortMode,
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  toggleTrackSelection,
  selectAll,
  deselectAll,
  invertSelection,
  exportToFile,
  playlistName,
  setPlaylistName,
  onSave,
  onBack,
  isSaving,
  user,
}: TrackSelectionViewProps) => {
  const selectedIds = new Set(selectedTracks.map(t => t.id));

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      {/* Header with playlist info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{result?.playlist_name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" style={{ borderColor: PLATFORM_INFO[result?.playlist_source || 'manual'].color }}>
              {PLATFORM_INFO[result?.playlist_source || 'manual'].icon} {PLATFORM_INFO[result?.playlist_source || 'manual'].name}
            </Badge>
            <span>{tracks.length} tracks</span>
            {result?.deduplicated ? (
              <span className="text-amber-500">({result.deduplicated} duplicates removed)</span>
            ) : null}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <RotateCcw className="w-4 h-4 mr-1" />
          Start Over
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Selection controls */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={selectAll}>
            <CheckSquare className="w-4 h-4 mr-1" />
            All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            <Square className="w-4 h-4 mr-1" />
            None
          </Button>
          <Button variant="outline" size="sm" onClick={invertSelection}>
            <Shuffle className="w-4 h-4 mr-1" />
            Invert
          </Button>
        </div>

        <div className="flex-1" />

        {/* Sort */}
        <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
          <SelectTrigger className="w-[140px]">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="original_order">Original</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="artist">Artist</SelectItem>
            <SelectItem value="duration">Duration</SelectItem>
            <SelectItem value="random_shuffle">Shuffle</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter toggle */}
        <Button 
          variant={showFilters ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
        </Button>

        {/* Export */}
        <Select onValueChange={(v) => exportToFile(v as any, true)}>
          <SelectTrigger className="w-[100px]">
            <Download className="w-4 h-4 mr-2" />
            <span>Export</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="m3u">M3U</SelectItem>
            <SelectItem value="txt">TXT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filters */}
      {showFilters && (
        <PlaylistFilters filters={filters} setFilters={setFilters} />
      )}

      {/* Track list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-1 pr-4">
          {filteredTracks.map((track, index) => (
            <PlaylistTrackItem
              key={track.id}
              track={track}
              index={index + 1}
              isSelected={selectedIds.has(track.id)}
              onToggle={() => toggleTrackSelection(track.id)}
            />
          ))}
          
          {filteredTracks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No tracks match your filters
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Playlist name (optional)"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            className="flex-1"
          />
          <Badge variant="secondary">
            {selectedTracks.length} selected
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={onSave} 
            disabled={!user || selectedTracks.length === 0 || isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Save {selectedTracks.length > 0 ? `${selectedTracks.length} Tracks` : 'Playlist'}
          </Button>
        </div>

        {!user && (
          <p className="text-xs text-center text-muted-foreground">
            Sign in to save playlists to your library
          </p>
        )}
      </div>
    </div>
  );
};

export default UniversalPlaylistImport;
