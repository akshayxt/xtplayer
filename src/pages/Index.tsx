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
import { ApiKeyProvider } from '@/contexts/ApiKeyContext';
import { AudioPlayerProvider, useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

const MainContent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { currentVideo } = useAudioPlayer();

  return (
    <div className={`min-h-screen flex flex-col bg-background ${currentVideo ? 'pb-24' : ''}`}>
      <Header onSearch={setSearchQuery} searchQuery={searchQuery} />
      <main className="container px-4 py-8 flex-1 page-transition">
        {searchQuery ? (
          <VideoGrid searchQuery={searchQuery} />
        ) : (
          <>
            <RecentlyPlayedGrid />
            <TrendingGrid />
            <PlaylistsGrid />
            <RecommendationsGrid />
          </>
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
      </Helmet>

      <ThemeProvider>
        <ApiKeyProvider>
          <AudioPlayerProvider>
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
            <MainContent />
          </AudioPlayerProvider>
        </ApiKeyProvider>
      </ThemeProvider>
    </>
  );
};

export default Index;
