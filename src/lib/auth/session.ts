import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getDB } from "@/lib/d1/client";

export const SESSION_COOKIE_NAME = "si_user_id";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function getSessionUserIdFromRequest(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getSessionUserFromCookies(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!userId) return null;

  const db = await getDB();
  const user = await db
    .prepare("SELECT id, email, name, image FROM user WHERE id = ?")
    .bind(userId)
    .first<SessionUser>();

  return user ?? null;
}
