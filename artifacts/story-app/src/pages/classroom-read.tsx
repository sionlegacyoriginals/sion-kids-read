/**
 * Teacher "Class Reading Mode" — project this on the board for group reading.
 * Accessible at /classroom/class-read/:storyId  (requires Clerk teacher auth)
 * Large text, sentence-highlighted audio, no exercises/points.
 */
import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Loader2, Play, Pause, Square, Volume2, ChevronLeft } from "lucide-react";
import { useAuth } from "@clerk/react";
import {
  useReadAlong,
  type ReadAlongParagraphData,
  type ActiveRange,
} from "@/components/read-along-player";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function HighlightedParagraph({
  pd,
  activeRange,
}: {
  pd: ReadAlongParagraphData;
  activeRange: ActiveRange;
}) {
  return (
    <>
      {pd.tokens.map((tok, i) => {
        const active =
          activeRange !== null &&
          tok.isWord &&
          tok.start >= activeRange[0] &&
          tok.start < activeRange[1];
        return (
          <span
            key={i}
            className={active ? "bg-yellow-300 text-yellow-900 rounded px-1 transition-colors" : ""}
          >
            {tok.text}
          </span>
        );
      })}
    </>
  );
}

export default function ClassroomRead() {
  const params = useParams<{ storyId: string }>();
  const [, navigate] = useLocation();
  const { getToken } = useAuth();

  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Build paragraphs for hook (empty until story loads)
  const paragraphs = story
    ? (story.content ?? "").split(/\n+/).map((p: string) => p.trim()).filter(Boolean)
    : [];

  // Battle-tested sentence-by-sentence reader — fixes Chrome long-text bug
  const readAlong = useReadAlong(paragraphs);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const r = await fetch(`${basePath}/api/classroom/teacher/stories/${params.storyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (d.story) setStory(d.story);
        else setError(d.error ?? "Story not found");
      } catch {
        setError("Could not load story.");
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { readAlong.stop(); };
  }, [params.storyId]);

  if (loading) return (
    <div className="flex min-h-[100dvh] items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-muted-foreground">{error}</p>
      <button onClick={() => navigate("/classroom-setup")} className="text-primary font-semibold hover:underline">
        ← Back to classroom
      </button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header with audio controls */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-5xl">
          <button
            onClick={() => { readAlong.stop(); navigate("/classroom-setup"); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-semibold"
          >
            <ChevronLeft className="w-4 h-4" /> Classroom
          </button>

          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
            📺 Class Reading Mode
          </span>

          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <button
              onClick={readAlong.togglePlay}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all text-sm"
            >
              {readAlong.isPlaying
                ? <><Pause className="w-4 h-4 fill-white" /> Pause</>
                : <><Play className="w-4 h-4 fill-white" /> {readAlong.activeRange ? "Resume" : "Read Aloud"}</>}
            </button>
            {(readAlong.isPlaying || readAlong.activeRange !== null) && (
              <button
                onClick={readAlong.stop}
                className="p-2 rounded-full border border-border hover:bg-muted transition-all"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Story — large text for projection */}
      <main className="container mx-auto px-6 py-10 max-w-3xl">
        {story.cover_image_url && (
          <img
            src={story.cover_image_url}
            alt={story.title}
            className="w-full rounded-3xl object-cover max-h-96 shadow-lg mb-10"
          />
        )}

        <h1 className="text-4xl font-serif font-bold text-foreground mb-10 text-center leading-snug">
          {story.title}
        </h1>

        <div className="space-y-8">
          {readAlong.paragraphData.length > 0
            ? readAlong.paragraphData.map((pd, i) => (
                <p key={i} className="text-foreground leading-loose text-2xl font-serif">
                  <HighlightedParagraph pd={pd} activeRange={readAlong.activeRange} />
                </p>
              ))
            : paragraphs.map((p: string, i: number) => (
                <p key={i} className="text-foreground leading-loose text-2xl font-serif">{p}</p>
              ))
          }
        </div>
      </main>
    </div>
  );
}
