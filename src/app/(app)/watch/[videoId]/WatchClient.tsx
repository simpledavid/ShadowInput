"use client";

import { useState, useCallback, useRef } from "react";
import { VideoPlayer } from "@/components/watch/VideoPlayer";
import { TranscriptPanel } from "@/components/watch/TranscriptPanel";
import Link from "next/link";

export function WatchClient({ videoId }: { videoId: string }) {
  const [currentTime, setCurrentTime] = useState(0);
  const seekRef = useRef<((s: number) => void) | null>(null);

  const handleSeekRegister = useCallback((fn: (s: number) => void) => {
    seekRef.current = fn;
  }, []);

  const handleSeekTo = useCallback((seconds: number) => {
    seekRef.current?.(seconds);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden lg:flex-row">
      {/* Left: Video */}
      <div className="flex flex-col overflow-auto border-b border-zinc-800 p-4 lg:w-[60%] lg:border-b-0 lg:border-r">
        <Link
          href="/browse"
          className="mb-3 flex w-fit items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to browse
        </Link>

        <VideoPlayer
          videoId={videoId}
          onTimeUpdate={setCurrentTime}
          onSeek={handleSeekRegister}
        />

        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-fit items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          Open on YouTube
        </a>
      </div>

      {/* Right: Transcript + AI */}
      <div className="flex-1 overflow-hidden lg:w-[40%]">
        <TranscriptPanel
          videoId={videoId}
          currentTime={currentTime}
          onSeekTo={handleSeekTo}
        />
      </div>
    </div>
  );
}
