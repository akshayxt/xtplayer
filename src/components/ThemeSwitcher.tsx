import { Moon, Sun, Sparkles, Zap, RotateCcw } from 'lucide-react';
import { useTheme, ThemePreset } from '@/contexts/ThemeContext';
import { AnimatedButton } from '@/components/ui/animated-button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const themes: { id: ThemePreset; name: string; icon: React.ReactNode; colors: string[] }[] = [
  { id: 'dark', name: 'Dark', icon: <Moon className="w-4 h-4" />, colors: ['#0a0a0a', '#171717', '#e11d48'] },
  { id: 'light', name: 'Light', icon: <Sun className="w-4 h-4" />, colors: ['#fafafa', '#f5f5f5', '#dc2626'] },
  { id: 'glass', name: 'Glass', icon: <Sparkles className="w-4 h-4" />, colors: ['#1a1f2e', '#252d3d', '#38bdf8'] },
  { id: 'neon', name: 'Neon', icon: <Zap className="w-4 h-4" />, colors: ['#0d0815', '#1a0f29', '#a855f7'] },
];

const huePresets = [
  { name: 'Red', hue: 0 },
  { name: 'Orange', hue: 25 },
  { name: 'Yellow', hue: 45 },
  { name: 'Green', hue: 140 },
  { name: 'Cyan', hue: 180 },
  { name: 'Blue', hue: 220 },
  { name: 'Purple', hue: 280 },
  { name: 'Pink', hue: 330 },
];

const ThemeSwitcher = () => {
  const {
    theme,
    setThemePreset,
    setAnimationSpeed,
    setShadowIntensity,
    setBlurIntensity,
    setPrimaryHue,
    resetToDefaults,
  } = useTheme();

  return (
    <div className="space-y-6">
      {/* Theme Presets */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium">Theme Preset</Label>
        <div className="grid grid-cols-2 gap-2">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setThemePreset(t.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200",
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
                    className="w-4 h-4 rounded-full border border-background"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {t.icon}
                <span className="text-sm font-medium">{t.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Primary Color */}
      {(theme.preset === 'dark' || theme.preset === 'light') && (
        <div className="space-y-3">
          <Label className="text-foreground font-medium">Accent Color</Label>
          <div className="flex flex-wrap gap-2">
            {huePresets.map((preset) => (
              <button
                key={preset.hue}
                onClick={() => setPrimaryHue(preset.hue)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all duration-200",
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
      )}

      <Separator />

      {/* Animation Speed */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-foreground font-medium">Animation Speed</Label>
          <span className="text-xs text-muted-foreground">{theme.animationSpeed.toFixed(1)}x</span>
        </div>
        <Slider
          value={[theme.animationSpeed]}
          onValueChange={([value]) => setAnimationSpeed(value)}
          min={0.5}
          max={2}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Slower</span>
          <span>Faster</span>
        </div>
      </div>

      {/* Shadow Intensity */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-foreground font-medium">Shadow Intensity</Label>
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
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-foreground font-medium">Blur Intensity</Label>
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

      <Separator />

      {/* Reset Button */}
      <AnimatedButton
        variant="outline"
        onClick={resetToDefaults}
        className="w-full"
      >
        <RotateCcw className="w-4 h-4" />
        Reset to Defaults
      </AnimatedButton>
    </div>
  );
};

export default ThemeSwitcher;
