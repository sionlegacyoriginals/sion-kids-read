import { useCallback, useEffect, useState } from "react";
import { Music2, PlayCircle, Loader2, RefreshCw } from "lucide-react";
import { useMusic, type MusicVideo } from "@/lib/musicContext";

interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function MusicPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { current, play } = useMusic();

  const loadVideos = useCallback((forceRefresh = false) => {
    const url = `${BASE}/api/music/videos${forceRefresh ? "?refresh=1" : ""}`;
    if (forceRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setVideos(data.videos ?? []); })
      .catch(() => { setError("Couldn't load videos. Please try again."); })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  // Always force-refresh on mount so deleted videos vanish immediately
  // (the server rate-limits rss2json calls to once/min, so this is safe)
  useEffect(() => { loadVideos(true); }, [loadVideos]);

  function handlePlay(v: VideoItem) {
    const video: MusicVideo = { id: v.id, title: v.title, thumbnail: v.thumbnail };
    // Pass full queue so the player can autoplay through all songs
    const fullQueue: MusicVideo[] = videos.map((vid) => ({
      id: vid.id,
      title: vid.title,
      thumbnail: vid.thumbnail,
    }));
    play(video, fullQueue);
  }

  return (
    <div className="max-w-5xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
          <Music2 className="w-7 h-7 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-foreground">Sion Kids Music</h1>
          <p className="text-muted-foreground mt-0.5">
            Songs and videos from{" "}
            <a
              href="https://www.youtube.com/@sionkidslife"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 hover:underline font-medium"
            >
              @sionkidslife
            </a>{" "}
            — music keeps playing while you use the rest of the app!
          </p>
        </div>
        <button
          onClick={() => loadVideos(true)}
          disabled={refreshing}
          title="Refresh video list"
          className="shrink-0 p-2.5 rounded-xl text-muted-foreground hover:text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading videos…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-20 text-muted-foreground">{error}</div>
      )}

      {/* Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((v) => {
            const isPlaying = current?.id === v.id;
            return (
              <button
                key={v.id}
                onClick={() => handlePlay(v)}
                className={`group text-left rounded-2xl border overflow-hidden transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                  isPlaying
                    ? "border-violet-400 shadow-md ring-2 ring-violet-200"
                    : "border-border hover:border-violet-200"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-black">
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                      isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                    style={{ background: "rgba(0,0,0,0.35)" }}
                  >
                    <PlayCircle
                      className={`w-14 h-14 drop-shadow ${
                        isPlaying ? "text-violet-300" : "text-white"
                      }`}
                    />
                  </div>
                  {isPlaying && (
                    <span className="absolute top-2 left-2 bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      ♪ Playing
                    </span>
                  )}
                </div>

                {/* Title */}
                <div className="p-3">
                  <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                    {v.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(v.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
