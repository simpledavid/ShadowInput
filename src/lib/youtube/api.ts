import { iso8601ToSeconds } from "@/lib/utils/time";
import type { YouTubeVideo } from "@/types/youtube";

const YOUTUBE_BASE = "https://www.googleapis.com/youtube/v3";

export async function fetchSubscriptions(accessToken: string, pageToken?: string) {
  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    mine: "true",
    maxResults: "50",
    ...(pageToken ? { pageToken } : {}),
  });
  const res = await fetch(`${YOUTUBE_BASE}/subscriptions?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`YouTube subscriptions API ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

/** Fetch videos from a channel using its uploads playlist (1 unit/page, not 100) */
export async function fetchChannelVideos(
  channelId: string,
  accessToken: string,
  pageToken?: string
) {
  // UCxxxxxx → UUxxxxxx (uploads playlist)
  const uploadsPlaylistId = "UU" + channelId.slice(2);
  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: "24",
    ...(pageToken ? { pageToken } : {}),
  });
  const res = await fetch(`${YOUTUBE_BASE}/playlistItems?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`YouTube playlistItems API ${res.status}`);
  return res.json();
}

/** Batch-fetch video details (title, duration, stats) */
export async function fetchVideoDetails(
  videoIds: string[],
  accessToken: string
): Promise<YouTubeVideo[]> {
  const params = new URLSearchParams({
    part: "snippet,contentDetails,statistics",
    id: videoIds.join(","),
    maxResults: "50",
  });
  const res = await fetch(`${YOUTUBE_BASE}/videos?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`YouTube videos API ${res.status}`);
  const data = await res.json();

  return (data.items || []).map((item: any): YouTubeVideo => ({
    video_id: item.id,
    channel_id: item.snippet.channelId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail_url:
      item.snippet.thumbnails?.maxres?.url ||
      item.snippet.thumbnails?.high?.url ||
      item.snippet.thumbnails?.medium?.url ||
      null,
    published_at: item.snippet.publishedAt,
    duration: item.contentDetails?.duration || null,
    duration_seconds: item.contentDetails?.duration
      ? iso8601ToSeconds(item.contentDetails.duration)
      : null,
    view_count: item.statistics?.viewCount
      ? parseInt(item.statistics.viewCount)
      : null,
    caption_available: item.contentDetails?.caption === "true",
    default_language: item.snippet?.defaultLanguage || null,
  }));
}

export async function fetchCaptionsList(videoId: string, accessToken: string) {
  const params = new URLSearchParams({ part: "snippet", videoId });
  const res = await fetch(`${YOUTUBE_BASE}/captions?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`YouTube captions API ${res.status}`);
  return res.json();
}

export async function downloadCaption(captionId: string, accessToken: string): Promise<string> {
  const res = await fetch(
    `${YOUTUBE_BASE}/captions/${captionId}?tfmt=srt`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`YouTube caption download ${res.status}`);
  return res.text();
}
