import { useEffect, useState } from "react";
import { useMusic, MUSIC_STORAGE_KEY, MusicVideo } from "@/lib/musicContext";
import { X, Music2, Play, SkipBack, SkipForward } from "lucide-react";
import { useLocation } from "wouter";

interface SavedMusic {
  current: MusicVideo;
  queue: MusicVideo[];
}

function readStorage(): SavedMusic | null {
  try {
    const raw = localStorage.getItem(MUSIC_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.current?.id) return parsed as SavedMusic;
  } catch {}
  return null;
}

export function MiniMusicPlayer() {
  const { current, queue, play, stop } = useMusic();
  const [, navigate] = useLocation();

  // Independently track a "resumable" song read straight from localStorage.
  // This survives any React state reset — the player component is always the
  // source of truth for whether there is something to resume.
  const [resumed, setResumed] = useState(false);
  const [saved, setSaved] = useState<SavedMusic | null>(null);

  useEffect(() => {
    // On mount, check localStorage for a previously playing song.
    const found = readStorage();
    if (found && !current) {
      setSaved(found);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop music automatically when Read Aloud is opened.
  useEffect(() => {
    function onReadAlongStart() {
      setSaved(null);
      setResumed(false);
      stop();
    }
    window.addEventListener("sion:readalong-start", onReadAlongStart);
    return () => window.removeEventListener("sion:readalong-start", onReadAlongStart);
  }, [stop]);

  // Once play() is called on context, we no longer need the localStorage copy.
  useEffect(() => {
    if (current) {
      setSaved(null);
      setResumed(false);
    }
  }, [current]);

  // Decide what to show:
  // 1. Active (context has a song) — show live iframe
  // 2. Restorable (saved from localStorage, not yet resumed) — show resume button
  // 3. Nothing — return null
  const activeVideo = current;
  const activeQueue = queue;
  const restoreVideo = !current ? saved?.current ?? null : null;
  const restoreQueue = !current ? saved?.queue ?? [] : [];

  const video = activeVideo ?? restoreVideo;
  const videoQueue = activeVideo ? activeQueue : restoreQueue;
  const isRestored = !activeVideo && !!restoreVideo && !resumed;

  if (!video) return null;

  // Embed only the current video — YouTube ignores the path video ID when a
  // playlist param is present and starts from the first playlist item instead,
  // causing an off-by-one. Our prev/next buttons handle all navigation.
  const embedUrl =
    `https://www.youtube.com/embed/${video.id}` +
    `?autoplay=1&rel=0&modestbranding=1`;

  function handleResume() {
    setResumed(true);
    play(video!, videoQueue.length > 0 ? videoQueue : undefined);
  }

  function handleStop() {
    setSaved(null);
    setResumed(false);
    stop();
  }

  function handleSkip(direction: "prev" | "next") {
    if (!video || videoQueue.length === 0) return;
    const idx = videoQueue.findIndex((v) => v.id === video.id);
    let nextIdx: number;
    if (direction === "next") {
      nextIdx = idx >= 0 ? (idx + 1) % videoQueue.length : 0;
    } else {
      nextIdx = idx > 0 ? idx - 1 : videoQueue.length - 1;
    }
    const nextVideo = videoQueue[nextIdx];
    setResumed(true);
    play(nextVideo, videoQueue);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white border-t border-purple-100 shadow-[0_-4px_20px_rgba(109,40,217,0.10)]">
      <div className="flex items-center gap-3 px-3 py-2 max-w-3xl mx-auto">

        {/* Thumbnail / player area */}
        <div
          className="relative shrink-0 rounded-xl overflow-hidden bg-black"
          style={{ width: 112, height: 63 }}
        >
          {isRestored ? (
            /* After a page refresh, autoplay is blocked by the browser.
               Show a tap-to-resume button instead of a silent iframe. */
            <button
              onClick={handleResume}
              className="absolute inset-0 flex items-center justify-center"
              aria-label="Resume music"
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
              <div className="relative z-10 w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
            </button>
          ) : (
            <iframe
              key={video.id}
              src={embedUrl}
              width="112"
              height="63"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="block"
              title={video.title}
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Music2 className="w-3 h-3 text-violet-500 shrink-0" />
            <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">
              {isRestored ? "Tap ▶ to resume" : "Now playing"}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {video.title}
          </p>
          <p className="text-xs text-muted-foreground">Sion Kids Life</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {videoQueue.length > 1 && (
            <button
              onClick={() => handleSkip("prev")}
              className="p-2 rounded-lg text-muted-foreground hover:text-violet-600 hover:bg-violet-50 transition-colors"
              aria-label="Previous song"
            >
              <SkipBack className="w-4 h-4" />
            </button>
          )}
          {videoQueue.length > 1 && (
            <button
              onClick={() => handleSkip("next")}
              className="p-2 rounded-lg text-muted-foreground hover:text-violet-600 hover:bg-violet-50 transition-colors"
              aria-label="Next song"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => navigate("/music")}
            className="px-2.5 py-1.5 text-xs font-semibold text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
          >
            See all
          </button>
          <button
            onClick={handleStop}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Stop music"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
