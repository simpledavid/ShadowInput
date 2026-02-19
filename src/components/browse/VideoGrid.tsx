"use client";

import { useEffect, useState, useCallback } from "react";
import { VideoCard } from "./VideoCard";
import type { YouTubeVideo } from "@/types/youtube";

interface VideoGridProps {
  channelId?: string | null;
}

export function VideoGrid({ channelId }: VideoGridProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = useCallback(async (pageToken?: string) => {
    if (!channelId) {
      setVideos([]);
      setIsLoading(false);
      return;
    }

    const params = new URLSearchParams({ channelId });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`/api/youtube/channel-videos?${params}`);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to load videos");
    }
    return res.json();
  }, [channelId]);

  useEffect(() => {
    setIsLoading(true);
    setVideos([]);
    setNextPageToken(null);
    setError(null);

    if (!channelId) {
      setIsLoading(false);
      return;
    }

    loadVideos().then((data) => {
      if (data) {
        setVideos(data.videos || []);
        setNextPageToken(data.nextPageToken);
      }
    }).catch((e) => {
      setError(e.message);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [channelId, loadVideos]);

  const handleLoadMore = async () => {
    if (!nextPageToken || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await loadVideos(nextPageToken);
      if (data) {
        setVideos((prev) => [...prev, ...(data.videos || [])]);
        setNextPageToken(data.nextPageToken);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (!channelId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg className="mb-4 h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p className="text-zinc-500">Select a channel from the sidebar to browse videos</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex flex-col rounded-xl bg-zinc-900 overflow-hidden border border-zinc-800">
            <div className="aspect-video animate-pulse bg-zinc-800" />
            <div className="p-3 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-zinc-800" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-zinc-500">No videos found for this channel.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {videos.map((video) => (
          <VideoCard key={video.video_id} video={video} />
        ))}
      </div>
      {nextPageToken && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2 text-sm text-zinc-300
                       hover:border-zinc-600 hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
