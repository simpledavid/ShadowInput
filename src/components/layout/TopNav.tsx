"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface TopNavProps {
  user?: { email?: string; user_metadata?: { avatar_url?: string; full_name?: string } };
}

export function TopNav({ user }: TopNavProps) {
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-zinc-200">ShadowInput</span>
        <span className="text-xs text-zinc-600">YouTube English Learning</span>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">
            {user.user_metadata?.full_name || user.email}
          </span>
          {user.user_metadata?.avatar_url ? (
            <Image
              src={user.user_metadata.avatar_url}
              alt="Avatar"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">
              {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
