import { YoutubeTranscript } from "youtube-transcript";
import { fetchCaptionsList, downloadCaption } from "./api";
import type { TranscriptCue, TranscriptResult } from "@/types/transcript";

export type { TranscriptCue, TranscriptResult };

export async function fetchTranscript(
  videoId: string,
  lang: string,
  accessToken?: string
): Promise<TranscriptResult | null> {
  // Layer 1: npm package (zero quota, works for auto-generated captions)
  try {
    const rawCues = await YoutubeTranscript.fetchTranscript(videoId, { lang });
    if (rawCues && rawCues.length > 0) {
      return {
        cues: rawCues.map((c) => ({
          start: c.offset / 1000,
          dur: c.duration / 1000,
          text: c.text,
        })),
        source: "auto_generated",
      };
    }
  } catch {
    // Try fallback
  }

  // Try English if language-specific failed
  if (lang !== "en") {
    try {
      const rawCues = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
      if (rawCues && rawCues.length > 0) {
        return {
          cues: rawCues.map((c) => ({
            start: c.offset / 1000,
            dur: c.duration / 1000,
            text: c.text,
          })),
          source: "auto_generated",
        };
      }
    } catch {
      // Try API fallback
    }
  }

  // Layer 2: Official YouTube Captions API (costs 200 units, requires OAuth)
  if (!accessToken) return null;

  try {
    const captionsList = await fetchCaptionsList(videoId, accessToken);
    const track =
      captionsList.items?.find(
        (item: any) =>
          item.snippet.language === lang && item.snippet.trackKind !== "asr"
      ) ||
      captionsList.items?.find(
        (item: any) => item.snippet.language === "en"
      ) ||
      captionsList.items?.[0];

    if (!track) return null;

    const srtText = await downloadCaption(track.id, accessToken);
    const cues = parseSRT(srtText);
    if (cues.length === 0) return null;

    return { cues, source: "youtube_api" };
  } catch {
    return null;
  }
}

function parseSRT(srt: string): TranscriptCue[] {
  const blocks = srt.trim().split(/\n\n+/);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      const timeLine = lines[1] || "";
      const text = lines
        .slice(2)
        .join(" ")
        .replace(/<[^>]+>/g, "")
        .trim();
      const [startStr, endStr] = timeLine.split(" --> ");
      if (!startStr || !endStr) return null;
      const start = srtTimeToSeconds(startStr);
      const end = srtTimeToSeconds(endStr);
      return { start, dur: end - start, text };
    })
    .filter((c): c is TranscriptCue => c !== null && c.text.length > 0);
}

function srtTimeToSeconds(t: string): number {
  const cleaned = t.trim().replace(",", ".");
  const parts = cleaned.split(":");
  if (parts.length !== 3) return 0;
  return (
    parseInt(parts[0]) * 3600 +
    parseInt(parts[1]) * 60 +
    parseFloat(parts[2])
  );
}
