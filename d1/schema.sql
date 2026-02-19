-- ShadowInput D1 Schema (SQLite)
-- Apply with: npx wrangler d1 execute shadow-input --file=d1/schema.sql --remote

CREATE TABLE IF NOT EXISTS youtube_tokens (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id     TEXT NOT NULL UNIQUE,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at  TEXT NOT NULL,
  scopes      TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cached_subscriptions (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id       TEXT NOT NULL,
  channel_id    TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  thumbnail_url TEXT,
  description   TEXT,
  fetched_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, channel_id)
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON cached_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS cached_videos (
  video_id          TEXT PRIMARY KEY,
  channel_id        TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  thumbnail_url     TEXT,
  published_at      TEXT,
  duration          TEXT,
  duration_seconds  INTEGER,
  view_count        INTEGER,
  caption_available INTEGER DEFAULT 0,
  default_language  TEXT,
  tags              TEXT,
  fetched_at        TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_videos_channel ON cached_videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_published ON cached_videos(published_at DESC);

CREATE TABLE IF NOT EXISTS cached_transcripts (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  video_id      TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'en',
  source        TEXT NOT NULL,
  cues          TEXT NOT NULL,
  fetched_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(video_id, language_code),
  FOREIGN KEY (video_id) REFERENCES cached_videos(video_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_transcripts_video ON cached_transcripts(video_id);

CREATE TABLE IF NOT EXISTS user_word_history (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id          TEXT NOT NULL,
  video_id         TEXT,
  word             TEXT NOT NULL,
  context_sentence TEXT,
  explanation      TEXT,
  looked_up_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_words_user ON user_word_history(user_id);
CREATE INDEX IF NOT EXISTS idx_words_user_word ON user_word_history(user_id, word);

CREATE TABLE IF NOT EXISTS api_quota_tracking (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date         TEXT NOT NULL UNIQUE DEFAULT (date('now')),
  units_used   INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT DEFAULT (datetime('now'))
);
