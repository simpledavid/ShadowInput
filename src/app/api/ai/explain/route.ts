import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/d1/client";
import { getCachedExplanation, insertWordHistory } from "@/lib/d1/queries";
import { getExplanation } from "@/lib/ai/explain";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";

export const runtime = "nodejs";

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

  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDB();

  // Check D1 cache first
  const cached = await getCachedExplanation(db, userId, word, sentence);
  if (cached) return NextResponse.json({ explanation: cached, fromCache: true });

  // Call Claude
  const explanation = await getExplanation({ word, sentence, videoId, videoTitle, mode });

  // Store asynchronously (don't await)
  insertWordHistory(db, userId, word, sentence, explanation, videoId).catch(console.error);

  return NextResponse.json({ explanation, fromCache: false });
}
