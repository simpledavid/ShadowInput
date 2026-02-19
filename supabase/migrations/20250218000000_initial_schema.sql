-- ============================================================
-- ShadowInput — Initial Schema
-- ============================================================

-- user_profiles: mirrors auth.users with app-specific fields
CREATE TABLE public.user_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT,
  display_name   TEXT,
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================

-- youtube_tokens: stores OAuth provider tokens
CREATE TABLE public.youtube_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  scopes          TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.youtube_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tokens"
  ON public.youtube_tokens FOR ALL USING (auth.uid() = user_id);

-- ============================================================

-- cached_subscriptions: per-user subscribed channels (6h TTL)
CREATE TABLE public.cached_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id      TEXT NOT NULL,
  channel_title   TEXT NOT NULL,
  thumbnail_url   TEXT,
  description     TEXT,
  fetched_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

ALTER TABLE public.cached_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.cached_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions"
  ON public.cached_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own subscriptions"
  ON public.cached_subscriptions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_cached_subscriptions_user ON public.cached_subscriptions(user_id);

-- ============================================================

-- cached_videos: shared video metadata cache
CREATE TABLE public.cached_videos (
  video_id          TEXT PRIMARY KEY,
  channel_id        TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  thumbnail_url     TEXT,
  published_at      TIMESTAMPTZ,
  duration          TEXT,
  duration_seconds  INTEGER,
  view_count        BIGINT,
  caption_available BOOLEAN DEFAULT FALSE,
  default_language  TEXT,
  tags              TEXT[],
  fetched_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cached_videos_channel ON public.cached_videos(channel_id);
CREATE INDEX idx_cached_videos_published ON public.cached_videos(published_at DESC);

-- ============================================================

-- cached_transcripts: permanent transcript cache
CREATE TABLE public.cached_transcripts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id      TEXT NOT NULL REFERENCES public.cached_videos(video_id) ON DELETE CASCADE,
  language_code TEXT NOT NULL DEFAULT 'en',
  source        TEXT NOT NULL,
  cues          JSONB NOT NULL,
  fetched_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, language_code)
);

CREATE INDEX idx_cached_transcripts_video ON public.cached_transcripts(video_id);

-- ============================================================

-- user_word_history: words/sentences looked up with AI explanations
CREATE TABLE public.user_word_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id         TEXT,
  word             TEXT NOT NULL,
  context_sentence TEXT,
  explanation      JSONB,
  looked_up_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_word_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own word history"
  ON public.user_word_history FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_word_history_user ON public.user_word_history(user_id);
CREATE INDEX idx_word_history_word ON public.user_word_history(user_id, word);

-- ============================================================

-- api_quota_tracking: YouTube API daily quota usage
CREATE TABLE public.api_quota_tracking (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  units_used   INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);
