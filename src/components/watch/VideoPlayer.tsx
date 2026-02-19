"use client";

import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";

interface VideoPlayerProps {
  videoId: string;
  onTimeUpdate?: (time: number) => void;
  onSeek?: (seekFn: (seconds: number) => void) => void;
}

export function VideoPlayer({ videoId, onTimeUpdate, onSeek }: VideoPlayerProps) {
  const containerId = `yt-player-${videoId}`;
  const { currentTime, isReady, seekTo } = useYouTubePlayer(videoId, containerId);

  // Expose seekTo to parent
  if (onSeek) onSeek(seekTo);
  if (onTimeUpdate && isReady) onTimeUpdate(currentTime);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16/9" }}>
      <div id={containerId} className="absolute inset-0 h-full w-full" />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <svg className="h-8 w-8 animate-spin text-zinc-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
    </div>
  );
}
