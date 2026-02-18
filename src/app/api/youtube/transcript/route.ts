import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDB } from "@/lib/d1/client";
import { getCachedTranscript, upsertTranscript, videoExists } from "@/lib/d1/queries";
import { fetchTranscript } from "@/lib/youtube/transcript";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");
  const lang = searchParams.get("lang") || "en";
  if (!videoId) return NextResponse.json({ error: "Missing videoId" }, { status: 400 });

  const db = await getDB();

  // Check D1 permanent cache
  const cached = await getCachedTranscript(db, videoId, lang);
  if (cached) return NextResponse.json({ ...cached, fromCache: true });

  // Get user's YouTube token for API fallback
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let accessToken: string | undefined;
  if (user) {
    const row = await db
      .prepare("SELECT access_token FROM youtube_tokens WHERE user_id = ?")
      .bind(user.id)
      .first<{ access_token: string }>();
    accessToken = row?.access_token;
  }

  const result = await fetchTranscript(videoId, lang, accessToken);
  if (!result) {
    return NextResponse.json({ error: "No transcript available for this video" }, { status: 404 });
  }

  // Cache permanently (only if video record exists in D1)
  const exists = await videoExists(db, videoId);
  if (exists) {
    await upsertTranscript(db, videoId, lang, result);
  }

  return NextResponse.json({ cues: result.cues, source: result.source, fromCache: false });
}
