export interface TranscriptCue {
  start: number;   // seconds
  dur: number;     // seconds
  text: string;
}

export interface TranscriptResult {
  cues: TranscriptCue[];
  source: "youtube_api" | "npm_package" | "auto_generated";
}
