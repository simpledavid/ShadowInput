"use client";

import { useEffect, useState } from "react";
import type { TranscriptCue } from "@/types/transcript";

export function useTranscript(videoId: string, lang = "en") {
  const [cues, setCues] = useState<TranscriptCue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/youtube/transcript?videoId=${videoId}&lang=${lang}`
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "No transcript available");
        }
        const data = await res.json();
        setCues(data.cues || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [videoId, lang]);

  /** Find the index of the active cue for a given playback time */
  function getActiveCueIndex(currentTime: number): number {
    let lastActive = -1;
    for (let i = 0; i < cues.length; i++) {
      if (currentTime >= cues[i].start) {
        lastActive = i;
      } else {
        break;
      }
    }
    return lastActive;
  }

  return { cues, isLoading, error, getActiveCueIndex };
}
