import Link from "next/link";
import Image from "next/image";
import { formatDuration, relativeTime } from "@/lib/utils/time";
import type { YouTubeVideo } from "@/types/youtube";

interface VideoCardProps {
  video: YouTubeVideo;
}

export function VideoCard({ video }: VideoCardProps) {
  const duration = video.duration_seconds ? formatDuration(video.duration_seconds) : null;
  const timeAgo = video.published_at ? relativeTime(video.published_at) : null;

  return (
    <Link
      href={`/watch/${video.video_id}`}
      className="group flex flex-col rounded-xl bg-zinc-900 overflow-hidden border border-zinc-800
                 hover:border-zinc-600 transition-all duration-200 hover:bg-zinc-800/80"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-zinc-800">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg className="h-10 w-10 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {duration && (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-mono text-white">
            {duration}
          </span>
        )}
        {video.caption_available && (
          <span className="absolute top-2 left-2 rounded bg-emerald-600/90 px-1.5 py-0.5 text-xs font-medium text-white">
            CC
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100 group-hover:text-white">
          {video.title}
        </p>
        {timeAgo && (
          <p className="text-xs text-zinc-500">{timeAgo}</p>
        )}
      </div>
    </Link>
  );
}
