/**
 * Teacher "Class Reading Mode" — project this on the board for group reading.
 * Accessible at /classroom/class-read/:storyId  (requires Clerk teacher auth)
 * Large text, audio with word highlighting, no exercises/points.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Loader2, Play, Pause, Square, Volume2, ChevronLeft, BookOpen } from "lucide-react";
import { useAuth } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function HighlightedText({ text, activeCharIndex }: { text: string; activeCharIndex: number }) {
  const tokens: { type: "word" | "space"; text: string; start: number }[] = [];
  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) {
      let j = i;
      while (j < text.length && /\s/.test(text[j])) j++;
      tokens.push({ type: "space", text: text.slice(i, j), start: i });
      i = j;
    } else {
      let j = i;
      while (j < text.length && !/\s/.test(text[j])) j++;
      tokens.push({ type: "word", text: text.slice(i, j), start: i });
      i = j;
    }
  }
  return (
    <>
      {tokens.map((tok, idx) => {
        if (tok.type === "space") return <span key={idx}>{tok.text}</span>;
        const isActive = activeCharIndex >= tok.start && activeCharIndex < tok.start + tok.text.length;
        return (
          <span
            key={idx}
            className={isActive ? "bg-yellow-300 text-yellow-900 rounded px-1 transition-colors" : ""}
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeCharIndex, setActiveCharIndex] = useState(-1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
    return () => { window.speechSynthesis?.cancel(); };
  }, [params.storyId]);

  const startReading = useCallback(() => {
    if (!story?.content) return;
    window.speechSynthesis?.cancel();

    const utterance = new SpeechSynthesisUtterance(story.content);
    utterance.rate = 0.85;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis?.getVoices() ?? [];
    const preferred = voices.find(v =>
      v.lang.startsWith("en") && (v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Daniel"))
    ) ?? voices.find(v => v.lang.startsWith("en"));
    if (preferred) utterance.voice = preferred;

    utterance.onboundary = (e) => { if (e.name === "word") setActiveCharIndex(e.charIndex); };
    utterance.onend = () => { setIsPlaying(false); setActiveCharIndex(-1); };
    utterance.onerror = () => { setIsPlaying(false); setActiveCharIndex(-1); };

    utteranceRef.current = utterance;
    window.speechSynthesis?.speak(utterance);
    setIsPlaying(true);
  }, [story]);

  function pauseReading() { window.speechSynthesis?.pause(); setIsPlaying(false); }
  function resumeReading() { window.speechSynthesis?.resume(); setIsPlaying(true); }
  function stopReading() { window.speechSynthesis?.cancel(); setIsPlaying(false); setActiveCharIndex(-1); }

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

  const paragraphs = (story.content ?? "").split(/\n+/).map((p: string) => p.trim()).filter(Boolean);
  let charCursor = 0;
  const parasWithOffset = paragraphs.map((p: string) => {
    const start = charCursor;
    charCursor += p.length + 1;
    return { text: p, start };
  });

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-5xl">
          <button
            onClick={() => { stopReading(); navigate("/classroom-setup"); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-semibold"
          >
            <ChevronLeft className="w-4 h-4" /> Classroom
          </button>
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
            📺 Class Reading Mode
          </span>
          {/* Audio controls in header */}
          <div className="flex items-center gap-2">
            {!isPlaying ? (
              <button
                onClick={utteranceRef.current && window.speechSynthesis?.paused ? resumeReading : startReading}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all text-sm"
              >
                <Play className="w-4 h-4 fill-white" />
                {utteranceRef.current && window.speechSynthesis?.paused ? "Resume" : "Read Aloud"}
              </button>
            ) : (
              <button
                onClick={pauseReading}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all text-sm"
              >
                <Pause className="w-4 h-4 fill-white" /> Pause
              </button>
            )}
            {(isPlaying || activeCharIndex >= 0) && (
              <button
                onClick={stopReading}
                className="p-2 rounded-full border border-border hover:bg-muted transition-all"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Story */}
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
          {parasWithOffset.map((para, i) => (
            <p key={i} className="text-foreground leading-loose text-2xl font-serif">
              <HighlightedText
                text={para.text}
                activeCharIndex={activeCharIndex >= 0 ? activeCharIndex - para.start : -1}
              />
            </p>
          ))}
        </div>
      </main>
    </div>
  );
}
