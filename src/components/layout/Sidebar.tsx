"use client";

import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export function Sidebar() {
  const { channels, isLoading } = useSubscriptions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeChannel = searchParams.get("channel");

  return (
    <aside className="flex w-60 flex-col overflow-hidden border-r border-zinc-800 bg-zinc-900">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20">
          <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-white">ShadowInput</span>
      </div>

      {/* All videos link */}
      <div className="px-2 pt-3">
        <Link
          href="/browse"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors
            ${!activeChannel
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"}`}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          All Subscriptions
        </Link>
      </div>

      {/* Channel list */}
      <div className="mt-2 flex-1 overflow-y-auto px-2 pb-4">
        <p className="mb-1 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-600">
          Channels
        </p>

        {isLoading && (
          <div className="space-y-1 px-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2">
                <div className="h-6 w-6 animate-pulse rounded-full bg-zinc-800" />
                <div className="h-3 w-28 animate-pulse rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        )}

        {channels.map((ch) => (
          <button
            key={ch.channel_id}
            onClick={() => router.push(`/browse?channel=${ch.channel_id}`)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors
              ${activeChannel === ch.channel_id
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"}`}
          >
            {ch.thumbnail_url ? (
              <Image
                src={ch.thumbnail_url}
                alt={ch.channel_title}
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs text-zinc-400">
                {ch.channel_title[0]}
              </div>
            )}
            <span className="truncate">{ch.channel_title}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
