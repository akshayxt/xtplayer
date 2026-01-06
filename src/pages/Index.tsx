import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import SplashScreen from '@/components/SplashScreen';
import Header from '@/components/Header';
import VideoGrid from '@/components/VideoGrid';
import MiniPlayer from '@/components/MiniPlayer';
import ContactSection from '@/components/ContactSection';
import { ApiKeyProvider } from '@/contexts/ApiKeyContext';
import { AudioPlayerProvider, useAudioPlayer } from '@/contexts/AudioPlayerContext';

const MainContent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { currentVideo } = useAudioPlayer();

  return (
    <div className={`min-h-screen flex flex-col bg-background ${currentVideo ? 'pb-24' : ''}`}>
      <Header onSearch={setSearchQuery} searchQuery={searchQuery} />
      <main className="container px-4 py-8 flex-1">
        <VideoGrid searchQuery={searchQuery} />
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
          content="XT Builds - Stream music and videos with background playback. Your premium YouTube music experience."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Helmet>

      <ApiKeyProvider>
        <AudioPlayerProvider>
          {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
          <MainContent />
        </AudioPlayerProvider>
      </ApiKeyProvider>
    </>
  );
};

export default Index;
