import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/d1/client";
import { upsertYouTubeToken } from "@/lib/d1/queries";
import { fetchWithProxy } from "@/lib/utils/fetch-with-proxy";
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from "@/lib/auth/session";

export const runtime = "nodejs";

const CALLBACK_PATH = "/api/auth/oauth/google/callback";

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/login?error=missing_google_config`);
  }

  const redirectUri = `${origin}${CALLBACK_PATH}`;

  let tokenData: GoogleTokenResponse;
  try {
    const tokenResp = await fetchWithProxy("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    tokenData = (await tokenResp.json()) as GoogleTokenResponse;
    if (!tokenResp.ok || !tokenData.access_token) {
      console.error("[auth/callback] token exchange failed:", tokenData);
      return NextResponse.redirect(`${origin}/login?error=token_exchange_failed`);
    }
  } catch (error) {
    console.error("[auth/callback] token request failed:", error);
    return NextResponse.redirect(`${origin}/login?error=google_network_error`);
  }

  let userInfo: GoogleUserInfo;
  try {
    const userResp = await fetchWithProxy("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    userInfo = (await userResp.json()) as GoogleUserInfo;
    if (!userResp.ok || !userInfo.sub || !userInfo.email) {
      console.error("[auth/callback] userinfo failed:", userInfo);
      return NextResponse.redirect(`${origin}/login?error=userinfo_failed`);
    }
  } catch (error) {
    console.error("[auth/callback] userinfo request failed:", error);
    return NextResponse.redirect(`${origin}/login?error=google_network_error`);
  }

  try {
    const db = await getDB();

    await db
      .prepare(`
        INSERT INTO user (id, name, email, emailVerified, image, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          email = excluded.email,
          emailVerified = excluded.emailVerified,
          image = excluded.image,
          updatedAt = datetime('now')
      `)
      .bind(
        userInfo.sub,
        userInfo.name ?? userInfo.email,
        userInfo.email,
        userInfo.email_verified ? 1 : 0,
        userInfo.picture ?? null
      )
      .run();

    await upsertYouTubeToken(
      db,
      userInfo.sub,
      tokenData.access_token,
      tokenData.refresh_token ?? null,
      new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString()
    );

    const response = NextResponse.redirect(`${origin}/browse`);
    response.cookies.set(
      SESSION_COOKIE_NAME,
      userInfo.sub,
      getSessionCookieOptions()
    );
    return response;
  } catch (error) {
    console.error("[auth/callback] D1 write failed:", error);
    return NextResponse.redirect(`${origin}/login?error=d1_write_failed`);
  }
}
