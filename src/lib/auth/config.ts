import { betterAuth } from "better-auth";

// Better Auth is created per-request in edge/Workers environment
// so the D1 database binding can be passed in at request time.
export function createAuth(db: D1Database) {
  return betterAuth({
    database: {
      db,
      type: "sqlite",
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        scope: [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/youtube.readonly",
          "https://www.googleapis.com/auth/youtube.force-ssl",
        ],
        // These params get the refresh_token on first login
        accessType: "offline",
        prompt: "consent",
      },
    },
    session: {
      cookieName: "si_session",
      expiresIn: 60 * 60 * 24 * 30, // 30 days
    },
    trustedOrigins: [
      "https://shadowinput.pages.dev",
      "http://localhost:3000",
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
