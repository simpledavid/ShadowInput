import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/d1/client";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { fetchWithProxy } from "@/lib/utils/fetch-with-proxy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDB();
  const tokenRow = await db
    .prepare("SELECT refresh_token, expires_at FROM youtube_tokens WHERE user_id = ?")
    .bind(userId)
    .first<{ refresh_token: string | null; expires_at: string }>();

  if (!tokenRow?.refresh_token) {
    return NextResponse.json({ error: "no_refresh_token", requiresReauth: true }, { status: 401 });
  }

  // Already valid?
  if (new Date(tokenRow.expires_at).getTime() > Date.now() + 5 * 60 * 1000) {
    return NextResponse.json({ success: true, alreadyValid: true });
  }

  const resp = await fetchWithProxy("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: tokenRow.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const refreshed = await resp.json() as { access_token?: string; expires_in?: number; error?: string };
  if (!refreshed.access_token) {
    return NextResponse.json({ error: refreshed.error ?? "refresh_failed", requiresReauth: true }, { status: 401 });
  }

  await db
    .prepare("UPDATE youtube_tokens SET access_token = ?, expires_at = ?, updated_at = datetime('now') WHERE user_id = ?")
    .bind(
      refreshed.access_token,
      new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString(),
      userId
    )
    .run();

  return NextResponse.json({ success: true });
}
