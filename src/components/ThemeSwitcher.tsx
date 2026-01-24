import { useState } from 'react';
import { 
  Moon, Sun, Sparkles, Zap, RotateCcw, Type, Maximize2, Circle, 
  Activity, Palette, Grid, Square, Image, Layers, SunMedium,
  TreeDeciduous, Waves, ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  useTheme, ThemePreset, FontSize, SpacingMode, BorderRadiusSize,
  FontFamily, IconSize, LayoutDensity, ButtonStyle, CardStyle
} from '@/contexts/ThemeContext';
import { AnimatedButton } from '@/components/ui/animated-button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const themes: { id: ThemePreset; name: string; icon: React.ReactNode; colors: string[] }[] = [
  { id: 'dark', name: 'Dark', icon: <Moon className="w-4 h-4" />, colors: ['#0a0a0a', '#171717', '#e11d48'] },
  { id: 'light', name: 'Light', icon: <Sun className="w-4 h-4" />, colors: ['#fafafa', '#f5f5f5', '#dc2626'] },
  { id: 'glass', name: 'Glass', icon: <Sparkles className="w-4 h-4" />, colors: ['#1a1f2e', '#252d3d', '#38bdf8'] },
  { id: 'neon', name: 'Neon', icon: <Zap className="w-4 h-4" />, colors: ['#0d0815', '#1a0f29', '#a855f7'] },
  { id: 'midnight', name: 'Midnight', icon: <Moon className="w-4 h-4" />, colors: ['#0f172a', '#1e293b', '#6366f1'] },
  { id: 'sunset', name: 'Sunset', icon: <SunMedium className="w-4 h-4" />, colors: ['#1c1917', '#292524', '#f97316'] },
  { id: 'forest', name: 'Forest', icon: <TreeDeciduous className="w-4 h-4" />, colors: ['#0c1a12', '#1a2f23', '#22c55e'] },
  { id: 'ocean', name: 'Ocean', icon: <Waves className="w-4 h-4" />, colors: ['#0c1929', '#1a3449', '#06b6d4'] },
];

const huePresets = [
  { name: 'Red', hue: 0 },
  { name: 'Orange', hue: 25 },
  { name: 'Yellow', hue: 45 },
  { name: 'Lime', hue: 80 },
  { name: 'Green', hue: 140 },
  { name: 'Cyan', hue: 180 },
  { name: 'Blue', hue: 220 },
  { name: 'Purple', hue: 280 },
  { name: 'Pink', hue: 330 },
];

const fontSizes: { id: FontSize; name: string }[] = [
  { id: 'xs', name: 'XS' },
  { id: 'small', name: 'S' },
  { id: 'medium', name: 'M' },
  { id: 'large', name: 'L' },
  { id: 'xl', name: 'XL' },
];

const spacingModes: { id: SpacingMode; name: string }[] = [
  { id: 'compact', name: 'Compact' },
  { id: 'comfortable', name: 'Comfortable' },
  { id: 'spacious', name: 'Spacious' },
];

const borderRadii: { id: BorderRadiusSize; name: string; preview: string }[] = [
  { id: 'none', name: 'Sharp', preview: 'rounded-none' },
  { id: 'small', name: 'Subtle', preview: 'rounded-sm' },
  { id: 'medium', name: 'Rounded', preview: 'rounded-md' },
  { id: 'large', name: 'Soft', preview: 'rounded-xl' },
  { id: 'full', name: 'Pill', preview: 'rounded-full' },
];

const fontFamilies: { id: FontFamily; name: string }[] = [
  { id: 'system', name: 'System' },
  { id: 'inter', name: 'Inter' },
  { id: 'roboto', name: 'Roboto' },
  { id: 'poppins', name: 'Poppins' },
  { id: 'mono', name: 'Mono' },
];

const iconSizes: { id: IconSize; name: string }[] = [
  { id: 'small', name: 'Small' },
  { id: 'medium', name: 'Medium' },
  { id: 'large', name: 'Large' },
];

const layoutDensities: { id: LayoutDensity; name: string }[] = [
  { id: 'dense', name: 'Dense' },
  { id: 'normal', name: 'Normal' },
  { id: 'relaxed', name: 'Relaxed' },
];

const buttonStyles: { id: ButtonStyle; name: string }[] = [
  { id: 'solid', name: 'Solid' },
  { id: 'outline', name: 'Outline' },
  { id: 'ghost', name: 'Ghost' },
  { id: 'gradient', name: 'Gradient' },
];

const cardStyles: { id: CardStyle; name: string }[] = [
  { id: 'flat', name: 'Flat' },
  { id: 'elevated', name: 'Elevated' },
  { id: 'bordered', name: 'Bordered' },
  { id: 'glass', name: 'Glass' },
];

const ThemeSwitcher = () => {
  const {
    theme,
    setThemePreset,
    setAnimationSpeed,
    setShadowIntensity,
    setBlurIntensity,
    setPrimaryHue,
    setFontSize,
    setSpacingMode,
    setBorderRadius,
    setReducedMotion,
    setHighContrast,
    setFontFamily,
    setIconSize,
    setLayoutDensity,
    setButtonStyle,
    setCardStyle,
    setSaturation,
    setBrightness,
    setShowKeyboardShortcuts,
    setCompactPlayer,
    setShowAlbumArt,
    setGlowEffects,
    setTextShadow,
    setBorderWidth,
    setBackgroundOpacity,
    resetToDefaults,
  } = useTheme();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    themes: true,
    colors: true,
    typography: false,
    layout: false,
    effects: false,
    player: false,
    accessibility: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader = ({ id, title, icon }: { id: string; title: string; icon: React.ReactNode }) => (
    <CollapsibleTrigger 
      className="flex items-center justify-between w-full py-2 hover:text-primary transition-colors"
      onClick={() => toggleSection(id)}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-sm">{title}</span>
      </div>
      {expandedSections[id] ? (
        <ChevronUp className="w-4 h-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      )}
    </CollapsibleTrigger>
  );

  return (
    <div className="space-y-4">
      {/* Theme Presets */}
      <Collapsible open={expandedSections.themes}>
        <SectionHeader id="themes" title="Theme Presets" icon={<Palette className="w-4 h-4 text-primary" />} />
        <CollapsibleContent className="pt-3">
          <div className="grid grid-cols-2 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setThemePreset(t.id)}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all duration-200",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  theme.preset === t.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <div className="flex -space-x-1">
                  {t.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full border border-background"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium">{t.name}</span>
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Colors */}
      <Collapsible open={expandedSections.colors}>
        <SectionHeader id="colors" title="Colors" icon={<Palette className="w-4 h-4 text-primary" />} />
        <CollapsibleContent className="space-y-4 pt-3">
          {/* Accent Color */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Accent Color</Label>
            <div className="flex flex-wrap gap-1.5">
              {huePresets.map((preset) => (
                <button
                  key={preset.hue}
                  onClick={() => setPrimaryHue(preset.hue)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all duration-200",
                    "hover:scale-110 active:scale-95",
                    theme.primaryHue === preset.hue
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: `hsl(${preset.hue}, 85%, 55%)` }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Saturation */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Saturation</Label>
              <span className="text-xs text-muted-foreground">{theme.saturation}%</span>
            </div>
            <Slider
              value={[theme.saturation]}
              onValueChange={([value]) => setSaturation(value)}
              min={0}
              max={200}
              step={5}
              className="w-full"
            />
          </div>

          {/* Brightness */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Brightness</Label>
              <span className="text-xs text-muted-foreground">{theme.brightness}%</span>
            </div>
            <Slider
              value={[theme.brightness]}
              onValueChange={([value]) => setBrightness(value)}
              min={50}
              max={150}
              step={5}
              className="w-full"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Typography */}
      <Collapsible open={expandedSections.typography}>
        <SectionHeader id="typography" title="Typography" icon={<Type className="w-4 h-4 text-primary" />} />
        <CollapsibleContent className="space-y-4 pt-3">
          {/* Font Family */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Font Family</Label>
            <div className="flex flex-wrap gap-1.5">
              {fontFamilies.map((font) => (
                <button
                  key={font.id}
                  onClick={() => setFontFamily(font.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    theme.fontFamily === font.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  {font.name}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Font Size</Label>
            <div className="flex gap-1.5">
              {fontSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setFontSize(size.id)}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium transition-all",
                    theme.fontSize === size.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  {size.name}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Size */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Icon Size</Label>
            <div className="flex gap-2">
              {iconSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setIconSize(size.id)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    theme.iconSize === size.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  {size.name}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Layout */}
      <Collapsible open={expandedSections.layout}>
        <SectionHeader id="layout" title="Layout" icon={<Grid className="w-4 h-4 text-primary" />} />
        <CollapsibleContent className="space-y-4 pt-3">
          {/* Spacing Mode */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Spacing</Label>
            <div className="flex gap-1.5">
              {spacingModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSpacingMode(mode.id)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    theme.spacingMode === mode.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  {mode.name}
                </button>
              ))}
            </div>
          </div>

          {/* Layout Density */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Layout Density</Label>
            <div className="flex gap-1.5">
              {layoutDensities.map((density) => (
                <button
                  key={density.id}
                  onClick={() => setLayoutDensity(density.id)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    theme.layoutDensity === density.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  {density.name}
                </button>
              ))}
            </div>
          </div>

          {/* Border Radius */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Corner Radius</Label>
            <div className="flex gap-1">
              {borderRadii.map((radius) => (
                <button
                  key={radius.id}
                  onClick={() => setBorderRadius(radius.id)}
                  className={cn(
                    "flex-1 py-1.5 border text-xs font-medium transition-all",
                    radius.preview,
                    theme.borderRadius === radius.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  {radius.name}
                </button>
              ))}
            </div>
          </div>

          {/* Button Style */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Button Style</Label>
            <div className="flex flex-wrap gap-1.5">
              {buttonStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setButtonStyle(style.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    theme.buttonStyle === style.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>

          {/* Card Style */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Card Style</Label>
            <div className="flex flex-wrap gap-1.5">
              {cardStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setCardStyle(style.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    theme.cardStyle === style.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>

          {/* Border Width */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Border Width</Label>
              <span className="text-xs text-muted-foreground">{theme.borderWidth}px</span>
            </div>
            <Slider
              value={[theme.borderWidth]}
              onValueChange={([value]) => setBorderWidth(value)}
              min={0}
              max={4}
              step={1}
              className="w-full"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Effects */}
      <Collapsible open={expandedSections.effects}>
        <SectionHeader id="effects" title="Effects" icon={<Sparkles className="w-4 h-4 text-primary" />} />
        <CollapsibleContent className="space-y-4 pt-3">
          {/* Animation Speed */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Animation Speed</Label>
              <span className="text-xs text-muted-foreground">{theme.animationSpeed.toFixed(1)}x</span>
            </div>
            <Slider
              value={[theme.animationSpeed]}
              onValueChange={([value]) => setAnimationSpeed(value)}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
              disabled={theme.reducedMotion}
            />
          </div>

          {/* Shadow Intensity */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Shadow Intensity</Label>
              <span className="text-xs text-muted-foreground">{Math.round(theme.shadowIntensity * 100)}%</span>
            </div>
            <Slider
              value={[theme.shadowIntensity]}
              onValueChange={([value]) => setShadowIntensity(value)}
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Blur Intensity */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Blur Intensity</Label>
              <span className="text-xs text-muted-foreground">{Math.round(theme.blurIntensity * 100)}%</span>
            </div>
            <Slider
              value={[theme.blurIntensity]}
              onValueChange={([value]) => setBlurIntensity(value)}
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Background Opacity */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Background Opacity</Label>
              <span className="text-xs text-muted-foreground">{theme.backgroundOpacity}%</span>
            </div>
            <Slider
              value={[theme.backgroundOpacity]}
              onValueChange={([value]) => setBackgroundOpacity(value)}
              min={50}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Glow Effects */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Glow Effects</Label>
              <p className="text-xs text-muted-foreground">Subtle glow on elements</p>
            </div>
            <Switch
              checked={theme.glowEffects}
              onCheckedChange={setGlowEffects}
            />
          </div>

          {/* Text Shadow */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Text Shadow</Label>
              <p className="text-xs text-muted-foreground">Add depth to text</p>
            </div>
            <Switch
              checked={theme.textShadow}
              onCheckedChange={setTextShadow}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Player Options */}
      <Collapsible open={expandedSections.player}>
        <SectionHeader id="player" title="Player" icon={<Image className="w-4 h-4 text-primary" />} />
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Compact Player</Label>
              <p className="text-xs text-muted-foreground">Smaller player controls</p>
            </div>
            <Switch
              checked={theme.compactPlayer}
              onCheckedChange={setCompactPlayer}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Show Album Art</Label>
              <p className="text-xs text-muted-foreground">Display thumbnails</p>
            </div>
            <Switch
              checked={theme.showAlbumArt}
              onCheckedChange={setShowAlbumArt}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Keyboard Shortcuts</Label>
              <p className="text-xs text-muted-foreground">Enable hotkeys</p>
            </div>
            <Switch
              checked={theme.showKeyboardShortcuts}
              onCheckedChange={setShowKeyboardShortcuts}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Accessibility */}
      <Collapsible open={expandedSections.accessibility}>
        <SectionHeader id="accessibility" title="Accessibility" icon={<Activity className="w-4 h-4 text-primary" />} />
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Reduced Motion</Label>
              <p className="text-xs text-muted-foreground">Minimize animations</p>
            </div>
            <Switch
              checked={theme.reducedMotion}
              onCheckedChange={setReducedMotion}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">High Contrast</Label>
              <p className="text-xs text-muted-foreground">Increase color contrast</p>
            </div>
            <Switch
              checked={theme.highContrast}
              onCheckedChange={setHighContrast}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Reset Button */}
      <AnimatedButton
        variant="outline"
        onClick={resetToDefaults}
        className="w-full"
      >
        <RotateCcw className="w-4 h-4" />
        Reset All to Defaults
      </AnimatedButton>
    </div>
  );
};

export default ThemeSwitcher;
