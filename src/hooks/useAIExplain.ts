"use client";

import { useState } from "react";
import type { ExplanationResponse } from "@/types/ai";

interface ExplainState {
  word: string;
  sentence: string;
  mode: "word" | "sentence";
  explanation: ExplanationResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function useAIExplain(videoId?: string, videoTitle?: string) {
  const [state, setState] = useState<ExplainState>({
    word: "",
    sentence: "",
    mode: "word",
    explanation: null,
    isLoading: false,
    error: null,
  });

  async function explain(
    word: string,
    sentence: string,
    mode: "word" | "sentence" = "word"
  ) {
    setState((s) => ({ ...s, word, sentence, mode, isLoading: true, error: null, explanation: null }));

    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, sentence, videoId, videoTitle, mode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get explanation");
      }

      const data = await res.json();
      setState((s) => ({ ...s, explanation: data.explanation, isLoading: false }));
    } catch (e: any) {
      setState((s) => ({ ...s, error: e.message, isLoading: false }));
    }
  }

  function clear() {
    setState({ word: "", sentence: "", mode: "word", explanation: null, isLoading: false, error: null });
  }

  return { ...state, explain, clear };
}
