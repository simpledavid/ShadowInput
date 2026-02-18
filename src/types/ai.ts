export interface ExplanationRequest {
  word: string;
  sentence: string;
  videoId?: string;
  videoTitle?: string;
  mode: "word" | "sentence";
}

export interface ExplanationResponse {
  definition: string;
  pronunciation?: string;
  partOfSpeech?: string;
  examples: string[];
  synonyms?: string[];
  grammar?: string;
}
