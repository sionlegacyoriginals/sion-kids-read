import { useMusic } from "@/lib/musicContext";
import { X, Music2 } from "lucide-react";
import { useLocation } from "wouter";

export function MiniMusicPlayer() {
  const { current, queue, stop } = useMusic();
  const [, navigate] = useLocation();

  if (!current) return null;

  // Build a playlist so YouTube autoplays through all songs.
  // Current video plays first; remaining videos follow in order, then loop.
  const currentIndex = queue.findIndex((v) => v.id === current.id);
  const afterCurrent = currentIndex >= 0
    ? [...queue.slice(currentIndex + 1), ...queue.slice(0, currentIndex)]
    : [];

  const playlistParam = afterCurrent.length > 0
    ? `&playlist=${afterCurrent.map((v) => v.id).join(",")}`
    : "";

  const embedUrl =
    `https://www.youtube.com/embed/${current.id}` +
    `?autoplay=1&rel=0&modestbranding=1${playlistParam}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white border-t border-purple-100 shadow-[0_-4px_20px_rgba(109,40,217,0.10)]">
      <div className="flex items-center gap-3 px-3 py-2 max-w-3xl mx-auto">

        {/* Small visible YouTube iframe — this drives the audio */}
        <div className="relative shrink-0 rounded-xl overflow-hidden bg-black"
             style={{ width: 112, height: 63 }}>
          <iframe
            key={current.id}
            src={embedUrl}
            width="112"
            height="63"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="block"
            title={current.title}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Music2 className="w-3 h-3 text-violet-500 shrink-0" />
            <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Now playing</span>
          </div>
          <p className="text-sm font-semibold text-foreground truncate leading-tight">{current.title}</p>
          <p className="text-xs text-muted-foreground">Sion Kids Life</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => navigate("/music")}
            className="px-2.5 py-1.5 text-xs font-semibold text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
          >
            See all
          </button>
          <button
            onClick={stop}
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
