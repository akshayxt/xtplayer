import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemePreset = 'dark' | 'light' | 'glass' | 'neon';

interface ThemeSettings {
  preset: ThemePreset;
  animationSpeed: number;
  shadowIntensity: number;
  blurIntensity: number;
  primaryHue: number;
}

interface ThemeContextType {
  theme: ThemeSettings;
  setThemePreset: (preset: ThemePreset) => void;
  setAnimationSpeed: (speed: number) => void;
  setShadowIntensity: (intensity: number) => void;
  setBlurIntensity: (intensity: number) => void;
  setPrimaryHue: (hue: number) => void;
  resetToDefaults: () => void;
}

const defaultSettings: ThemeSettings = {
  preset: 'dark',
  animationSpeed: 1,
  shadowIntensity: 1,
  blurIntensity: 1,
  primaryHue: 0,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme-settings';

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
    root.classList.remove('theme-light', 'theme-glass', 'theme-neon');
    
    // Add current theme class (dark is default, no class needed)
    if (theme.preset !== 'dark') {
      root.classList.add(`theme-${theme.preset}`);
    }
    
    // Apply CSS variables
    root.style.setProperty('--animation-speed', theme.animationSpeed.toString());
    root.style.setProperty('--shadow-intensity', theme.shadowIntensity.toString());
    root.style.setProperty('--blur-intensity', theme.blurIntensity.toString());
    
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

  const resetToDefaults = useCallback(() => {
    setTheme(defaultSettings);
    localStorage.removeItem(THEME_STORAGE_KEY);
    // Reset CSS variables
    const root = document.documentElement;
    root.style.removeProperty('--primary');
    root.style.removeProperty('--ring');
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
