"use client";

import type { TranscriptCue } from "@/types/transcript";
import { cn } from "@/lib/utils/cn";

interface TranscriptLineProps {
  cue: TranscriptCue;
  isActive: boolean;
  onCueClick: (start: number) => void;
  onWordClick: (word: string, sentence: string) => void;
  onSentenceClick: (sentence: string) => void;
}

export function TranscriptLine({
  cue,
  isActive,
  onCueClick,
  onWordClick,
  onSentenceClick,
}: TranscriptLineProps) {
  const words = cue.text.split(/(\s+)/);

  return (
    <div
      className={cn(
        "group cursor-pointer rounded-lg px-3 py-2 transition-colors",
        isActive
          ? "bg-zinc-700 text-white"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      )}
    >
      {/* Click timestamp to seek */}
      <button
        onClick={() => onCueClick(cue.start)}
        className="mr-2 font-mono text-xs text-zinc-600 hover:text-indigo-400 transition-colors"
        title="Jump to this time"
      >
        {formatTime(cue.start)}
      </button>

      {/* Sentence click button */}
      <button
        onClick={() => onSentenceClick(cue.text)}
        className="mr-1 inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
        title="Explain this sentence"
      >
        <svg className="h-3 w-3 text-zinc-500 hover:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </button>

      {/* Clickable words */}
      {words.map((token, i) => {
        if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;
        const clean = token.replace(/[.,!?;:"'()[\]]/g, "").trim();
        return (
          <span
            key={i}
            className="cursor-pointer rounded px-0.5 hover:bg-amber-400/20 hover:text-amber-300 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (clean) onWordClick(clean, cue.text);
            }}
          >
            {token}
          </span>
        );
      })}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
