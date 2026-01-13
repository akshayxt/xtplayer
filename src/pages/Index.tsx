import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import SplashScreen from '@/components/SplashScreen';
import Header from '@/components/Header';
import VideoGrid from '@/components/VideoGrid';
import MiniPlayer from '@/components/MiniPlayer';
import ContactSection from '@/components/ContactSection';
import RecentlyPlayedGrid from '@/components/RecentlyPlayedGrid';
import TrendingGrid from '@/components/TrendingGrid';
import PlaylistsGrid from '@/components/PlaylistsGrid';
import RecommendationsGrid from '@/components/RecommendationsGrid';
import YTMusicHomeNew from '@/components/YTMusicHomeNew';
import YTMusicSearchNew from '@/components/YTMusicSearchNew';
import { ApiKeyProvider } from '@/contexts/ApiKeyContext';
import { AudioPlayerProvider, useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppModeProvider, useAppMode } from '@/contexts/AppModeContext';
import { MusicSyncProvider } from '@/contexts/MusicSyncContext';

const MainContent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { currentVideo } = useAudioPlayer();
  const { isYTMusicMode } = useAppMode();

  return (
    <div className={`min-h-screen flex flex-col bg-background ${currentVideo ? 'pb-24' : ''}`}>
      <Header onSearch={setSearchQuery} searchQuery={searchQuery} />
      <main className="container px-4 py-8 flex-1 page-transition">
        {isYTMusicMode ? (
          // YT Music Mode - YouTube Music, no API key required
          searchQuery ? (
            <YTMusicSearchNew searchQuery={searchQuery} />
          ) : (
            <YTMusicHomeNew />
          )
        ) : (
          // API Mode - Requires YouTube API key
          searchQuery ? (
            <VideoGrid searchQuery={searchQuery} />
          ) : (
            <>
              <RecentlyPlayedGrid />
              <TrendingGrid />
              <PlaylistsGrid />
              <RecommendationsGrid />
            </>
          )
        )}
      </main>
      <ContactSection />
      <MiniPlayer />
    </div>
  );
};

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <Helmet>
        <title>XT Builds - Premium Music Experience</title>
        <meta
          name="description"
          content="XT Builds - Stream music and videos with background playback. Your premium YouTube music experience with Apple-level UI animations."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        {/* PWA meta tags for background playback */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </Helmet>

      <AuthProvider>
        <AppModeProvider>
          <ThemeProvider>
            <ApiKeyProvider>
              <AudioPlayerProvider>
                <MusicSyncProvider>
                  {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
                  <MainContent />
                </MusicSyncProvider>
              </AudioPlayerProvider>
            </ApiKeyProvider>
          </ThemeProvider>
        </AppModeProvider>
      </AuthProvider>
    </>
  );
};

export default Index;
