"use client";

import { useEffect, useState } from "react";
import type { YouTubeChannel } from "@/types/youtube";

export function useSubscriptions() {
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/youtube/subscriptions");
        if (!res.ok) {
          const data = await res.json();
          if (data.requiresReauth) {
            window.location.href = "/login";
            return;
          }
          throw new Error(data.error || "Failed to load subscriptions");
        }
        const data = await res.json();
        setChannels(data.channels || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return { channels, isLoading, error };
}
