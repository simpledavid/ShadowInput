import { VideoGrid } from "@/components/browse/VideoGrid";

interface BrowsePageProps {
  searchParams: Promise<{ channel?: string }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const { channel } = await searchParams;

  return (
    <div className="p-5">
      {channel ? (
        <VideoGrid channelId={channel} />
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800">
            <svg className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-zinc-300">Choose a channel</h2>
          <p className="max-w-sm text-sm text-zinc-500">
            Select a channel from the sidebar to browse its videos and start learning English.
          </p>
        </div>
      )}
    </div>
  );
}
