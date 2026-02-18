// D1Database is globally available via worker-configuration.d.ts
import type { YouTubeVideo } from "@/types/youtube";
import type { TranscriptResult } from "@/types/transcript";
import type { ExplanationResponse } from "@/types/ai";

// ── YouTube Tokens ────────────────────────────────────────────────────────────

export async function getYouTubeToken(db: D1Database, userId: string) {
  return db
    .prepare("SELECT access_token, refresh_token, expires_at FROM youtube_tokens WHERE user_id = ?")
    .bind(userId)
    .first<{ access_token: string; refresh_token: string | null; expires_at: string }>();
}

export async function upsertYouTubeToken(
  db: D1Database,
  userId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: string
) {
  return db
    .prepare(`
      INSERT INTO youtube_tokens (user_id, access_token, refresh_token, expires_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = COALESCE(excluded.refresh_token, youtube_tokens.refresh_token),
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
    `)
    .bind(userId, accessToken, refreshToken, expiresAt)
    .run();
}

export async function updateYouTubeAccessToken(
  db: D1Database,
  userId: string,
  accessToken: string,
  expiresAt: string
) {
  return db
    .prepare(`
      UPDATE youtube_tokens
      SET access_token = ?, expires_at = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `)
    .bind(accessToken, expiresAt, userId)
    .run();
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export async function getCachedSubscriptions(db: D1Database, userId: string, maxAgeHours = 6) {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();
  const result = await db
    .prepare(`
      SELECT channel_id, channel_title, thumbnail_url, description, fetched_at
      FROM cached_subscriptions
      WHERE user_id = ? AND fetched_at >= ?
      ORDER BY channel_title
    `)
    .bind(userId, cutoff)
    .all<{ channel_id: string; channel_title: string; thumbnail_url: string | null; description: string | null; fetched_at: string }>();
  return result.results;
}

export async function replaceSubscriptions(
  db: D1Database,
  userId: string,
  channels: Array<{ channel_id: string; channel_title: string; thumbnail_url: string | null; description: string | null }>
) {
  const stmts: D1PreparedStatement[] = [
    db.prepare("DELETE FROM cached_subscriptions WHERE user_id = ?").bind(userId),
  ];
  for (const ch of channels) {
    stmts.push(
      db
        .prepare(`
          INSERT OR REPLACE INTO cached_subscriptions (user_id, channel_id, channel_title, thumbnail_url, description, fetched_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `)
        .bind(userId, ch.channel_id, ch.channel_title, ch.thumbnail_url, ch.description)
    );
  }
  return db.batch(stmts);
}

// ── Videos ────────────────────────────────────────────────────────────────────

export async function getCachedVideos(db: D1Database, videoIds: string[]) {
  if (videoIds.length === 0) return [];
  const placeholders = videoIds.map(() => "?").join(",");
  const result = await db
    .prepare(`SELECT * FROM cached_videos WHERE video_id IN (${placeholders})`)
    .bind(...videoIds)
    .all<YouTubeVideo>();
  return result.results;
}

export async function upsertVideos(db: D1Database, videos: YouTubeVideo[]) {
  if (videos.length === 0) return;
  const stmts = videos.map((v) =>
    db
      .prepare(`
        INSERT OR REPLACE INTO cached_videos
          (video_id, channel_id, title, description, thumbnail_url, published_at,
           duration, duration_seconds, view_count, caption_available, default_language, tags, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      .bind(
        v.video_id, v.channel_id, v.title, v.description ?? null,
        v.thumbnail_url ?? null, v.published_at ?? null,
        v.duration ?? null, v.duration_seconds ?? null,
        v.view_count ?? null, v.caption_available ? 1 : 0,
        v.default_language ?? null,
        null, // tags
      )
  );
  return db.batch(stmts);
}

// ── Transcripts ───────────────────────────────────────────────────────────────

export async function getCachedTranscript(db: D1Database, videoId: string, lang: string) {
  const row = await db
    .prepare("SELECT cues, source FROM cached_transcripts WHERE video_id = ? AND language_code = ?")
    .bind(videoId, lang)
    .first<{ cues: string; source: string }>();
  if (!row) return null;
  return { cues: JSON.parse(row.cues), source: row.source };
}

export async function upsertTranscript(
  db: D1Database,
  videoId: string,
  lang: string,
  result: TranscriptResult
) {
  return db
    .prepare(`
      INSERT OR REPLACE INTO cached_transcripts (video_id, language_code, source, cues, fetched_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `)
    .bind(videoId, lang, result.source, JSON.stringify(result.cues))
    .run();
}

// ── Word History ──────────────────────────────────────────────────────────────

export async function getCachedExplanation(
  db: D1Database,
  userId: string,
  word: string,
  contextSentence: string
) {
  const row = await db
    .prepare(`
      SELECT explanation FROM user_word_history
      WHERE user_id = ? AND word = ? AND context_sentence = ?
      ORDER BY looked_up_at DESC LIMIT 1
    `)
    .bind(userId, word.toLowerCase(), contextSentence)
    .first<{ explanation: string }>();
  if (!row?.explanation) return null;
  return JSON.parse(row.explanation) as ExplanationResponse;
}

export async function insertWordHistory(
  db: D1Database,
  userId: string,
  word: string,
  contextSentence: string,
  explanation: ExplanationResponse,
  videoId?: string
) {
  return db
    .prepare(`
      INSERT INTO user_word_history (user_id, video_id, word, context_sentence, explanation)
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(userId, videoId ?? null, word.toLowerCase(), contextSentence, JSON.stringify(explanation))
    .run();
}

export async function videoExists(db: D1Database, videoId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 FROM cached_videos WHERE video_id = ?")
    .bind(videoId)
    .first();
  return row !== null;
}
