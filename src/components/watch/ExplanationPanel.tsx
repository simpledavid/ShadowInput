"use client";

import type { ExplanationResponse } from "@/types/ai";

interface ExplanationPanelProps {
  word: string;
  sentence: string;
  mode: "word" | "sentence";
  explanation: ExplanationResponse | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

export function ExplanationPanel({
  word,
  sentence,
  mode,
  explanation,
  isLoading,
  error,
  onClose,
}: ExplanationPanelProps) {
  return (
    <div className="flex flex-col border-t border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-sm font-semibold text-zinc-200">
            {mode === "word" ? (
              <>
                <span className="text-amber-300">&ldquo;{word}&rdquo;</span>
                <span className="ml-1 text-zinc-500">— AI Explanation</span>
              </>
            ) : (
              "Sentence Explanation"
            )}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Context sentence */}
      <div className="px-4 py-2 text-xs text-zinc-500 italic border-b border-zinc-800/50">
        &ldquo;{sentence}&rdquo;
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Asking AI...
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {explanation && (
          <div className="space-y-3 text-sm">
            {/* Definition */}
            <div>
              {explanation.partOfSpeech && (
                <span className="mb-1 inline-block rounded bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">
                  {explanation.partOfSpeech}
                </span>
              )}
              {explanation.pronunciation && (
                <span className="ml-2 font-mono text-xs text-zinc-500">
                  {explanation.pronunciation}
                </span>
              )}
              <p className="mt-1 text-zinc-200">{explanation.definition}</p>
            </div>

            {/* Grammar */}
            {explanation.grammar && (
              <div className="rounded-lg bg-zinc-800/60 px-3 py-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Grammar
                </p>
                <p className="text-zinc-300">{explanation.grammar}</p>
              </div>
            )}

            {/* Examples */}
            {explanation.examples && explanation.examples.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Examples
                </p>
                <ul className="space-y-1">
                  {explanation.examples.map((ex, i) => (
                    <li key={i} className="text-zinc-300">
                      <span className="mr-1 text-zinc-600">•</span>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Synonyms */}
            {explanation.synonyms && explanation.synonyms.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Synonyms
                </p>
                <div className="flex flex-wrap gap-1">
                  {explanation.synonyms.map((syn) => (
                    <span
                      key={syn}
                      className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
                    >
                      {syn}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
