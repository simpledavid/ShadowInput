export interface YouTubeChannel {
  channel_id: string;
  channel_title: string;
  thumbnail_url: string | null;
  description: string | null;
  fetched_at?: string;
}

export interface YouTubeVideo {
  video_id: string;
  channel_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  duration: string | null;
  duration_seconds: number | null;
  view_count: number | null;
  caption_available: boolean;
  default_language: string | null;
}

export interface YouTubePlaylistItem {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  channelId: string;
}

export interface YouTubeApiVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelId: string;
    thumbnails: {
      medium?: { url: string };
      high?: { url: string };
      maxres?: { url: string };
    };
    defaultLanguage?: string;
    tags?: string[];
  };
  contentDetails: {
    duration: string;
    caption?: string;
  };
  statistics?: {
    viewCount?: string;
  };
}
