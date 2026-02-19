import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/d1/client";
import { getCachedVideos, upsertVideos } from "@/lib/d1/queries";
import { fetchChannelVideos, fetchVideoDetails } from "@/lib/youtube/api";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");
  const pageToken = searchParams.get("pageToken") || undefined;

  if (!channelId) return NextResponse.json({ error: "Missing channelId" }, { status: 400 });

  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDB();
  const tokenRow = await db
    .prepare("SELECT access_token FROM youtube_tokens WHERE user_id = ?")
    .bind(userId)
    .first<{ access_token: string }>();
  if (!tokenRow) return NextResponse.json({ error: "No YouTube token" }, { status: 401 });

  // Fetch playlist page (1 quota unit)
  const playlistData = await fetchChannelVideos(channelId, tokenRow.access_token, pageToken);
  const items = playlistData.items || [];
  if (items.length === 0) return NextResponse.json({ videos: [], nextPageToken: null });

  const videoIds: string[] = items
    .map((item: any) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
    .filter(Boolean);

  // Check D1 cache for video details
  const cachedVideos = await getCachedVideos(db, videoIds);
  const cachedIds = new Set(cachedVideos.map((v) => v.video_id));
  const missingIds = videoIds.filter((id) => !cachedIds.has(id));

  let freshVideos: any[] = [];
  if (missingIds.length > 0) {
    freshVideos = await fetchVideoDetails(missingIds, tokenRow.access_token);
    await upsertVideos(db, freshVideos);
  }

  const allVideos = [...cachedVideos, ...freshVideos];
  const videoMap = new Map(allVideos.map((v) => [v.video_id, v]));
  const ordered = videoIds.map((id) => videoMap.get(id)).filter(Boolean);

  return NextResponse.json({
    videos: ordered,
    nextPageToken: playlistData.nextPageToken ?? null,
  });
}
