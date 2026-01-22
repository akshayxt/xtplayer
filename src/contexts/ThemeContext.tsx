import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemePreset = 'dark' | 'light' | 'glass' | 'neon';
export type FontSize = 'small' | 'medium' | 'large';
export type SpacingMode = 'compact' | 'comfortable' | 'spacious';
export type BorderRadiusSize = 'none' | 'small' | 'medium' | 'large' | 'full';

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
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme-settings';

const fontSizeValues: Record<FontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
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
    root.classList.remove('theme-light', 'theme-glass', 'theme-neon', 'reduced-motion', 'high-contrast');
    
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
    
    // Apply CSS variables
    root.style.setProperty('--animation-speed', theme.reducedMotion ? '0' : theme.animationSpeed.toString());
    root.style.setProperty('--shadow-intensity', theme.shadowIntensity.toString());
    root.style.setProperty('--blur-intensity', theme.blurIntensity.toString());
    root.style.setProperty('--base-font-size', fontSizeValues[theme.fontSize]);
    root.style.setProperty('--spacing-scale', spacingValues[theme.spacingMode]);
    root.style.setProperty('--base-radius', borderRadiusValues[theme.borderRadius]);
    
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
