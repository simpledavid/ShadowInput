"use client";

import { useEffect, useRef } from "react";
import { useTranscript } from "@/hooks/useTranscript";
import { useAIExplain } from "@/hooks/useAIExplain";
import { TranscriptLine } from "./TranscriptLine";
import { ExplanationPanel } from "./ExplanationPanel";

interface TranscriptPanelProps {
  videoId: string;
  videoTitle?: string;
  currentTime: number;
  onSeekTo: (seconds: number) => void;
}

export function TranscriptPanel({
  videoId,
  videoTitle,
  currentTime,
  onSeekTo,
}: TranscriptPanelProps) {
  const { cues, isLoading, error, getActiveCueIndex } = useTranscript(videoId);
  const { word, sentence, mode, explanation, isLoading: aiLoading, error: aiError, explain, clear } =
    useAIExplain(videoId, videoTitle);

  const activeCueIndex = getActiveCueIndex(currentTime);
  const activeRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const showExplanation = !!(word || aiLoading || explanation);

  // Auto-scroll to active cue
  useEffect(() => {
    if (activeRef.current && panelRef.current) {
      const container = panelRef.current;
      const el = activeRef.current;
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const elTop = el.offsetTop;
      const elBottom = elTop + el.clientHeight;

      if (elBottom > containerBottom || elTop < containerTop) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeCueIndex]);

  const handleWordClick = (clickedWord: string, sentenceText: string) => {
    explain(clickedWord, sentenceText, "word");
  };

  const handleSentenceClick = (sentenceText: string) => {
    explain(sentenceText, sentenceText, "sentence");
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm font-medium text-zinc-300">Transcript</span>
        </div>
        <p className="text-xs text-zinc-600">Click a word to look it up</p>
      </div>

      {/* Transcript list */}
      <div
        ref={panelRef}
        className={`flex-1 overflow-y-auto px-2 py-2 ${showExplanation ? "max-h-[45%]" : ""}`}
      >
        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <svg className="h-5 w-5 animate-spin text-zinc-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {error && (
          <div className="p-4 text-center">
            <p className="text-sm text-zinc-500">{error}</p>
          </div>
        )}

        {!isLoading && !error && cues.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-sm text-zinc-500">No transcript available for this video.</p>
          </div>
        )}

        {cues.map((cue, index) => (
          <div key={index} ref={index === activeCueIndex ? activeRef : undefined}>
            <TranscriptLine
              cue={cue}
              isActive={index === activeCueIndex}
              onCueClick={onSeekTo}
              onWordClick={handleWordClick}
              onSentenceClick={handleSentenceClick}
            />
          </div>
        ))}
      </div>

      {/* AI Explanation panel */}
      {showExplanation && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ExplanationPanel
            word={word}
            sentence={sentence}
            mode={mode}
            explanation={explanation}
            isLoading={aiLoading}
            error={aiError}
            onClose={clear}
          />
        </div>
      )}
    </div>
  );
}
