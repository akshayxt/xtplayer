import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemePreset = 'dark' | 'light' | 'glass' | 'neon' | 'midnight' | 'sunset' | 'forest' | 'ocean';
export type FontSize = 'xs' | 'small' | 'medium' | 'large' | 'xl';
export type SpacingMode = 'compact' | 'comfortable' | 'spacious';
export type BorderRadiusSize = 'none' | 'small' | 'medium' | 'large' | 'full';
export type FontFamily = 'system' | 'inter' | 'roboto' | 'poppins' | 'mono';
export type IconSize = 'small' | 'medium' | 'large';
export type LayoutDensity = 'dense' | 'normal' | 'relaxed';
export type ButtonStyle = 'solid' | 'outline' | 'ghost' | 'gradient';
export type CardStyle = 'flat' | 'elevated' | 'bordered' | 'glass';

interface ThemeSettings {
  preset: ThemePreset;
  animationSpeed: number;
  shadowIntensity: number;
  blurIntensity: number;
  primaryHue: number;
  fontSize: FontSize;
  spacingMode: SpacingMode;
  borderRadius: BorderRadiusSize;
  reducedMotion: boolean;
  highContrast: boolean;
  // New settings
  fontFamily: FontFamily;
  iconSize: IconSize;
  layoutDensity: LayoutDensity;
  buttonStyle: ButtonStyle;
  cardStyle: CardStyle;
  saturation: number;
  brightness: number;
  showKeyboardShortcuts: boolean;
  compactPlayer: boolean;
  showAlbumArt: boolean;
  glowEffects: boolean;
  textShadow: boolean;
  borderWidth: number;
  backgroundOpacity: number;
}

interface ThemeContextType {
  theme: ThemeSettings;
  setThemePreset: (preset: ThemePreset) => void;
  setAnimationSpeed: (speed: number) => void;
  setShadowIntensity: (intensity: number) => void;
  setBlurIntensity: (intensity: number) => void;
  setPrimaryHue: (hue: number) => void;
  setFontSize: (size: FontSize) => void;
  setSpacingMode: (mode: SpacingMode) => void;
  setBorderRadius: (radius: BorderRadiusSize) => void;
  setReducedMotion: (reduced: boolean) => void;
  setHighContrast: (high: boolean) => void;
  // New setters
  setFontFamily: (family: FontFamily) => void;
  setIconSize: (size: IconSize) => void;
  setLayoutDensity: (density: LayoutDensity) => void;
  setButtonStyle: (style: ButtonStyle) => void;
  setCardStyle: (style: CardStyle) => void;
  setSaturation: (saturation: number) => void;
  setBrightness: (brightness: number) => void;
  setShowKeyboardShortcuts: (show: boolean) => void;
  setCompactPlayer: (compact: boolean) => void;
  setShowAlbumArt: (show: boolean) => void;
  setGlowEffects: (glow: boolean) => void;
  setTextShadow: (shadow: boolean) => void;
  setBorderWidth: (width: number) => void;
  setBackgroundOpacity: (opacity: number) => void;
  resetToDefaults: () => void;
}

const defaultSettings: ThemeSettings = {
  preset: 'dark',
  animationSpeed: 1,
  shadowIntensity: 1,
  blurIntensity: 1,
  primaryHue: 0,
  fontSize: 'medium',
  spacingMode: 'comfortable',
  borderRadius: 'medium',
  reducedMotion: false,
  highContrast: false,
  fontFamily: 'system',
  iconSize: 'medium',
  layoutDensity: 'normal',
  buttonStyle: 'solid',
  cardStyle: 'elevated',
  saturation: 100,
  brightness: 100,
  showKeyboardShortcuts: true,
  compactPlayer: false,
  showAlbumArt: true,
  glowEffects: true,
  textShadow: false,
  borderWidth: 1,
  backgroundOpacity: 100,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme-settings';

const fontSizeValues: Record<FontSize, string> = {
  xs: '12px',
  small: '14px',
  medium: '16px',
  large: '18px',
  xl: '20px',
};

const spacingValues: Record<SpacingMode, string> = {
  compact: '0.75',
  comfortable: '1',
  spacious: '1.25',
};

const borderRadiusValues: Record<BorderRadiusSize, string> = {
  none: '0px',
  small: '4px',
  medium: '8px',
  large: '16px',
  full: '9999px',
};

const fontFamilyValues: Record<FontFamily, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter", sans-serif',
  roboto: '"Roboto", sans-serif',
  poppins: '"Poppins", sans-serif',
  mono: '"JetBrains Mono", "Fira Code", monospace',
};

const iconSizeValues: Record<IconSize, string> = {
  small: '0.875',
  medium: '1',
  large: '1.25',
};

const layoutDensityValues: Record<LayoutDensity, { padding: string; gap: string }> = {
  dense: { padding: '0.5rem', gap: '0.25rem' },
  normal: { padding: '1rem', gap: '0.5rem' },
  relaxed: { padding: '1.5rem', gap: '1rem' },
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      try {
        return { ...defaultSettings, ...JSON.parse(stored) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove(
      'theme-light', 'theme-glass', 'theme-neon', 
      'theme-midnight', 'theme-sunset', 'theme-forest', 'theme-ocean',
      'reduced-motion', 'high-contrast',
      'glow-effects', 'text-shadow-enabled'
    );
    
    // Add current theme class (dark is default, no class needed)
    if (theme.preset !== 'dark') {
      root.classList.add(`theme-${theme.preset}`);
    }

    // Add accessibility classes
    if (theme.reducedMotion) {
      root.classList.add('reduced-motion');
    }
    if (theme.highContrast) {
      root.classList.add('high-contrast');
    }
    if (theme.glowEffects) {
      root.classList.add('glow-effects');
    }
    if (theme.textShadow) {
      root.classList.add('text-shadow-enabled');
    }
    
    // Apply CSS variables
    root.style.setProperty('--animation-speed', theme.reducedMotion ? '0' : theme.animationSpeed.toString());
    root.style.setProperty('--shadow-intensity', theme.shadowIntensity.toString());
    root.style.setProperty('--blur-intensity', theme.blurIntensity.toString());
    root.style.setProperty('--base-font-size', fontSizeValues[theme.fontSize]);
    root.style.setProperty('--spacing-scale', spacingValues[theme.spacingMode]);
    root.style.setProperty('--base-radius', borderRadiusValues[theme.borderRadius]);
    root.style.setProperty('--font-family', fontFamilyValues[theme.fontFamily]);
    root.style.setProperty('--icon-scale', iconSizeValues[theme.iconSize]);
    root.style.setProperty('--layout-padding', layoutDensityValues[theme.layoutDensity].padding);
    root.style.setProperty('--layout-gap', layoutDensityValues[theme.layoutDensity].gap);
    root.style.setProperty('--saturation', `${theme.saturation}%`);
    root.style.setProperty('--brightness', `${theme.brightness}%`);
    root.style.setProperty('--border-width', `${theme.borderWidth}px`);
    root.style.setProperty('--bg-opacity', (theme.backgroundOpacity / 100).toString());
    
    // Apply primary hue (only in dark/light themes)
    if (theme.primaryHue !== 0 && (theme.preset === 'dark' || theme.preset === 'light')) {
      root.style.setProperty('--primary', `${theme.primaryHue} 85% 55%`);
      root.style.setProperty('--ring', `${theme.primaryHue} 85% 55%`);
    }
    
    // Save to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  }, [theme]);

  const setThemePreset = useCallback((preset: ThemePreset) => {
    setTheme(prev => ({ ...prev, preset }));
  }, []);

  const setAnimationSpeed = useCallback((animationSpeed: number) => {
    setTheme(prev => ({ ...prev, animationSpeed }));
  }, []);

  const setShadowIntensity = useCallback((shadowIntensity: number) => {
    setTheme(prev => ({ ...prev, shadowIntensity }));
  }, []);

  const setBlurIntensity = useCallback((blurIntensity: number) => {
    setTheme(prev => ({ ...prev, blurIntensity }));
  }, []);

  const setPrimaryHue = useCallback((primaryHue: number) => {
    setTheme(prev => ({ ...prev, primaryHue }));
  }, []);

  const setFontSize = useCallback((fontSize: FontSize) => {
    setTheme(prev => ({ ...prev, fontSize }));
  }, []);

  const setSpacingMode = useCallback((spacingMode: SpacingMode) => {
    setTheme(prev => ({ ...prev, spacingMode }));
  }, []);

  const setBorderRadius = useCallback((borderRadius: BorderRadiusSize) => {
    setTheme(prev => ({ ...prev, borderRadius }));
  }, []);

  const setReducedMotion = useCallback((reducedMotion: boolean) => {
    setTheme(prev => ({ ...prev, reducedMotion }));
  }, []);

  const setHighContrast = useCallback((highContrast: boolean) => {
    setTheme(prev => ({ ...prev, highContrast }));
  }, []);

  // New setters
  const setFontFamily = useCallback((fontFamily: FontFamily) => {
    setTheme(prev => ({ ...prev, fontFamily }));
  }, []);

  const setIconSize = useCallback((iconSize: IconSize) => {
    setTheme(prev => ({ ...prev, iconSize }));
  }, []);

  const setLayoutDensity = useCallback((layoutDensity: LayoutDensity) => {
    setTheme(prev => ({ ...prev, layoutDensity }));
  }, []);

  const setButtonStyle = useCallback((buttonStyle: ButtonStyle) => {
    setTheme(prev => ({ ...prev, buttonStyle }));
  }, []);

  const setCardStyle = useCallback((cardStyle: CardStyle) => {
    setTheme(prev => ({ ...prev, cardStyle }));
  }, []);

  const setSaturation = useCallback((saturation: number) => {
    setTheme(prev => ({ ...prev, saturation }));
  }, []);

  const setBrightness = useCallback((brightness: number) => {
    setTheme(prev => ({ ...prev, brightness }));
  }, []);

  const setShowKeyboardShortcuts = useCallback((showKeyboardShortcuts: boolean) => {
    setTheme(prev => ({ ...prev, showKeyboardShortcuts }));
  }, []);

  const setCompactPlayer = useCallback((compactPlayer: boolean) => {
    setTheme(prev => ({ ...prev, compactPlayer }));
  }, []);

  const setShowAlbumArt = useCallback((showAlbumArt: boolean) => {
    setTheme(prev => ({ ...prev, showAlbumArt }));
  }, []);

  const setGlowEffects = useCallback((glowEffects: boolean) => {
    setTheme(prev => ({ ...prev, glowEffects }));
  }, []);

  const setTextShadow = useCallback((textShadow: boolean) => {
    setTheme(prev => ({ ...prev, textShadow }));
  }, []);

  const setBorderWidth = useCallback((borderWidth: number) => {
    setTheme(prev => ({ ...prev, borderWidth }));
  }, []);

  const setBackgroundOpacity = useCallback((backgroundOpacity: number) => {
    setTheme(prev => ({ ...prev, backgroundOpacity }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setTheme(defaultSettings);
    localStorage.removeItem(THEME_STORAGE_KEY);
    // Reset CSS variables
    const root = document.documentElement;
    root.style.removeProperty('--primary');
    root.style.removeProperty('--ring');
    root.style.removeProperty('--base-font-size');
    root.style.removeProperty('--spacing-scale');
    root.style.removeProperty('--base-radius');
    root.style.removeProperty('--font-family');
    root.style.removeProperty('--icon-scale');
    root.style.removeProperty('--layout-padding');
    root.style.removeProperty('--layout-gap');
    root.style.removeProperty('--saturation');
    root.style.removeProperty('--brightness');
    root.style.removeProperty('--border-width');
    root.style.removeProperty('--bg-opacity');
  }, []);

  return (
    <ThemeContext.Provider
      value={{
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
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
