import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/d1/client";
import { upsertYouTubeToken } from "@/lib/d1/queries";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[auth/callback] error:", error);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Save YouTube provider tokens to D1
  const { provider_token, provider_refresh_token, expires_at } = data.session;
  if (provider_token) {
    try {
      const db = await getDB();
      await upsertYouTubeToken(
        db,
        data.session.user.id,
        provider_token,
        provider_refresh_token ?? null,
        new Date((expires_at ?? 0) * 1000).toISOString()
      );
    } catch (err) {
      console.error("[auth/callback] D1 token save failed:", err);
      // Non-fatal — user is still logged in, token save can be retried
    }
  }

  return NextResponse.redirect(`${origin}/browse`);
}
