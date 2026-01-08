import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type AppMode = 'api' | 'ytmusic';

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isYTMusicMode: boolean;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export const AppModeProvider = ({ children }: { children: ReactNode }) => {
  const { profile, user, updatePreferredMode } = useAuth();
  const [mode, setModeState] = useState<AppMode>(() => {
    // Check localStorage for non-logged in users
    const stored = localStorage.getItem('appMode');
    return (stored as AppMode) || 'api';
  });

  // Sync with profile preference when user logs in
  useEffect(() => {
    if (profile?.preferred_mode) {
      setModeState(profile.preferred_mode);
    }
  }, [profile]);

  const setMode = async (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem('appMode', newMode);
    
    // Save to profile if logged in
    if (user) {
      await updatePreferredMode(newMode);
    }
  };

  return (
    <AppModeContext.Provider
      value={{
        mode,
        setMode,
        isYTMusicMode: mode === 'ytmusic',
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = () => {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
};
