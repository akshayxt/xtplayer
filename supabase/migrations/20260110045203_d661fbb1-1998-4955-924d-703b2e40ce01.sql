-- Create sync_sessions table for music sync feature
CREATE TABLE public.sync_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_key TEXT NOT NULL UNIQUE,
  host_user_id UUID NOT NULL,
  current_video_id TEXT,
  current_video_title TEXT,
  current_video_thumbnail TEXT,
  current_video_channel TEXT,
  start_timestamp BIGINT,
  current_position DOUBLE PRECISION DEFAULT 0,
  is_playing BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '6 hours'),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended'))
);

-- Create sync_participants table
CREATE TABLE public.sync_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sync_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  device_id TEXT NOT NULL,
  display_name TEXT,
  is_host BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_heartbeat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  latency_ms INTEGER DEFAULT 0,
  status TEXT DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'syncing'))
);

-- Create sync_events table for event broadcasting
CREATE TABLE public.sync_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sync_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('play', 'pause', 'seek', 'stop', 'song_change', 'heartbeat')),
  timestamp BIGINT NOT NULL,
  payload JSONB,
  sender_device_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sync_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;

-- Sync Sessions Policies
CREATE POLICY "Anyone can view active sessions by sync key"
ON public.sync_sessions
FOR SELECT
USING (status = 'active');

CREATE POLICY "Authenticated users can create sessions"
ON public.sync_sessions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their sessions"
ON public.sync_sessions
FOR UPDATE
USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can delete their sessions"
ON public.sync_sessions
FOR DELETE
USING (auth.uid() = host_user_id);

-- Sync Participants Policies
CREATE POLICY "Anyone can view participants in active sessions"
ON public.sync_participants
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.sync_sessions 
  WHERE sync_sessions.id = sync_participants.session_id 
  AND sync_sessions.status = 'active'
));

CREATE POLICY "Anyone can join a session"
ON public.sync_participants
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.sync_sessions 
  WHERE sync_sessions.id = sync_participants.session_id 
  AND sync_sessions.status = 'active'
));

CREATE POLICY "Participants can update their own status"
ON public.sync_participants
FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL AND device_id IS NOT NULL)
);

CREATE POLICY "Hosts or participants can leave"
ON public.sync_participants
FOR DELETE
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  EXISTS (
    SELECT 1 FROM public.sync_sessions 
    WHERE sync_sessions.id = sync_participants.session_id 
    AND sync_sessions.host_user_id = auth.uid()
  )
);

-- Sync Events Policies
CREATE POLICY "Anyone can view events in active sessions"
ON public.sync_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.sync_sessions 
  WHERE sync_sessions.id = sync_events.session_id 
  AND sync_sessions.status = 'active'
));

CREATE POLICY "Hosts can broadcast events"
ON public.sync_events
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.sync_sessions 
  WHERE sync_sessions.id = sync_events.session_id 
  AND sync_sessions.host_user_id = auth.uid()
));

-- Create trigger for updated_at on sync_sessions
CREATE TRIGGER update_sync_sessions_updated_at
BEFORE UPDATE ON public.sync_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for fast sync_key lookups
CREATE INDEX idx_sync_sessions_sync_key ON public.sync_sessions(sync_key);
CREATE INDEX idx_sync_sessions_status ON public.sync_sessions(status);
CREATE INDEX idx_sync_participants_session ON public.sync_participants(session_id);
CREATE INDEX idx_sync_events_session ON public.sync_events(session_id);

-- Enable realtime for sync tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_events;