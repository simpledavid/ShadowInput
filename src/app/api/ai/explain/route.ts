import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDB } from "@/lib/d1/client";
import { getCachedExplanation, insertWordHistory } from "@/lib/d1/queries";
import { getExplanation } from "@/lib/ai/explain";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    word: string;
    sentence: string;
    videoId?: string;
    videoTitle?: string;
    mode?: "word" | "sentence";
  };
  const { word, sentence, videoId, videoTitle, mode = "word" } = body;

  if (!word || !sentence) {
    return NextResponse.json({ error: "word and sentence are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDB();

  // Check D1 cache first
  const cached = await getCachedExplanation(db, user.id, word, sentence);
  if (cached) return NextResponse.json({ explanation: cached, fromCache: true });

  // Call Claude
  const explanation = await getExplanation({ word, sentence, videoId, videoTitle, mode });

  // Store asynchronously (don't await)
  insertWordHistory(db, user.id, word, sentence, explanation, videoId).catch(console.error);

  return NextResponse.json({ explanation, fromCache: false });
}
