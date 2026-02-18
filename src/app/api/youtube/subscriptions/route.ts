import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDB } from "@/lib/d1/client";
import { getCachedSubscriptions, replaceSubscriptions } from "@/lib/d1/queries";
import { fetchSubscriptions } from "@/lib/youtube/api";

export const runtime = "edge";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDB();

  // Check D1 cache (6h TTL)
  const cached = await getCachedSubscriptions(db, user.id);
  if (cached.length > 0) {
    return NextResponse.json({ channels: cached, fromCache: true });
  }

  // Get YouTube token from D1
  const tokenRow = await db
    .prepare("SELECT access_token, expires_at, refresh_token FROM youtube_tokens WHERE user_id = ?")
    .bind(user.id)
    .first<{ access_token: string; expires_at: string; refresh_token: string | null }>();

  if (!tokenRow) {
    return NextResponse.json({ error: "No YouTube token. Please reconnect.", requiresReauth: true }, { status: 401 });
  }

  // Inline token refresh if expired
  let accessToken = tokenRow.access_token;
  if (new Date(tokenRow.expires_at).getTime() <= Date.now() + 5 * 60 * 1000) {
    if (!tokenRow.refresh_token) {
      return NextResponse.json({ error: "Token expired", requiresReauth: true }, { status: 401 });
    }
    const resp = await fetch("https://oauth2.googleapis.com/token", {
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
      return NextResponse.json({ error: "Token refresh failed", requiresReauth: true }, { status: 401 });
    }
    accessToken = refreshed.access_token;
    await db
      .prepare("UPDATE youtube_tokens SET access_token = ?, expires_at = ?, updated_at = datetime('now') WHERE user_id = ?")
      .bind(accessToken, new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString(), user.id)
      .run();
  }

  // Paginate all subscriptions
  const allItems: any[] = [];
  let nextPageToken: string | undefined;
  do {
    const page = await fetchSubscriptions(accessToken, nextPageToken);
    allItems.push(...(page.items || []));
    nextPageToken = page.nextPageToken;
  } while (nextPageToken);

  const channels = allItems.map((item: any) => ({
    channel_id: item.snippet.resourceId.channelId,
    channel_title: item.snippet.title,
    thumbnail_url: item.snippet.thumbnails?.default?.url ?? null,
    description: item.snippet.description ?? null,
  }));

  await replaceSubscriptions(db, user.id, channels);

  const now = new Date().toISOString();
  return NextResponse.json({
    channels: channels.map(c => ({ ...c, user_id: user.id, fetched_at: now })),
    fromCache: false,
  });
}
