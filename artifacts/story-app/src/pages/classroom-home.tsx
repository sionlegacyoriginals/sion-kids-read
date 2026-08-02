import { useLocation } from "wouter";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Loader2, BookOpen, Star, Calendar, PenLine, Send, X,
  CheckCircle, Sparkles, ChevronLeft, Play, Pause, Square, Volume2,
  Pen, Eraser, Trash2,
} from "lucide-react";
import { AvatarPicker } from "@/components/avatar-picker";
import { DrawLayer, useDrawCanvas, type DrawMode } from "@/components/practice-section";
import { useStudentAuth } from "@/lib/studentAuth";
import {
  useReadAlong,
  buildReadAlongData,
  type ActiveRange,
  type ReadAlongParagraphData,
} from "@/components/read-along-player";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Convert a raw /ref-photos/{id} path returned by the classroom API into a
// full URL the browser can load. Parent stories routes do this server-side;
// classroom routes return the raw path, so we resolve it here.
function toImgUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("/ref-photos/")) return `${basePath}/api${path}`;
  return path; // already absolute
}

// ── Points toast ──────────────────────────────────────────────────────────────
function PointsToast({ points, label, onDone }: { points: number; label: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in">
      <div className="flex items-center gap-3 bg-yellow-400 text-yellow-900 font-bold px-6 py-3 rounded-2xl shadow-xl">
        <Star className="w-5 h-5 fill-yellow-700 text-yellow-700" />
        <span>+{points} {points === 1 ? "point" : "points"}! {label}</span>
      </div>
    </div>
  );
}

// ── Sentence-highlighted paragraph ────────────────────────────────────────────
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
            className={active ? "bg-yellow-300 text-yellow-900 rounded px-0.5 transition-colors" : ""}
          >
            {tok.text}
          </span>
        );
      })}
    </>
  );
}

// ── Sight-word exercise ───────────────────────────────────────────────────────
function SightWordExercises({
  exercises,
  onComplete,
  alreadyDone,
}: {
  exercises: { sentence: string; answer: string; options: string[] }[];
  onComplete: (correct: number) => void;
  alreadyDone: boolean;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(alreadyDone);
  const [score, setScore] = useState<number | null>(null);

  function submit() {
    let correct = 0;
    exercises.forEach((ex, i) => {
      if (answers[i]?.toLowerCase() === ex.answer.toLowerCase()) correct++;
    });
    setScore(correct);
    setSubmitted(true);
    onComplete(correct);
  }

  if (alreadyDone && score === null) {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-semibold">
        <CheckCircle className="w-4 h-4" /> Sight word exercises already completed!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <span className="text-xl">🔤</span> Fill in the Sight Word
      </h3>
      {exercises.map((ex, i) => (
        <div key={i} className="bg-muted/50 rounded-xl p-4 space-y-3">
          <p className="font-serif text-base leading-relaxed text-foreground">
            {ex.sentence.replace("___", "______")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ex.options.map((opt) => {
              const selected = answers[i] === opt;
              const isCorrect = submitted && opt.toLowerCase() === ex.answer.toLowerCase();
              const isWrong = submitted && selected && !isCorrect;
              return (
                <button
                  key={opt}
                  onClick={() => !submitted && setAnswers(prev => ({ ...prev, [i]: opt }))}
                  className={`px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all text-left
                    ${isCorrect ? "border-green-500 bg-green-50 text-green-800" :
                      isWrong ? "border-red-400 bg-red-50 text-red-700" :
                      selected ? "border-primary bg-primary/10 text-primary" :
                      "border-border bg-background hover:border-primary/50"}`}
                >
                  {opt}{isCorrect && " ✓"}{isWrong && " ✗"}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!submitted ? (
        <button
          onClick={submit}
          disabled={Object.keys(answers).length < exercises.length}
          className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40"
        >
          Check my answers
        </button>
      ) : (
        <div className={`rounded-xl px-4 py-3 font-bold text-center
          ${score === exercises.length ? "bg-green-50 border border-green-200 text-green-800" :
            "bg-blue-50 border border-blue-200 text-blue-800"}`}>
          {score === exercises.length ? `🎉 Perfect! ${score}/${exercises.length} correct!` : `${score}/${exercises.length} correct — great effort!`}
        </div>
      )}
    </div>
  );
}

// ── Sight-word tracing & writing practice ────────────────────────────────────
function WordDrawCard({ word, mode }: { word: string; mode: DrawMode }) {
  const clearFns = useRef<Record<string, () => void>>({});
  function reg(zone: string) {
    return (fn: () => void) => { clearFns.current[zone] = fn; };
  }
  function clearAll() {
    Object.values(clearFns.current).forEach((fn) => fn());
  }

  return (
    <div className="bg-white rounded-3xl border border-[#e8dfd5] shadow-sm overflow-hidden">
      {/* Word label */}
      <div className="px-6 pt-5 pb-3 border-b border-[#f0ebe5] flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">{word}</span>
        <button
          onClick={clearAll}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-all"
        >
          <Trash2 className="w-3 h-3" /> Clear
        </button>
      </div>

      {/* Trace in Print */}
      <div className="px-6 pt-4 pb-5 border-b border-[#f0ebe5]">
        <p className="text-[10px] font-bold tracking-[0.15em] text-[#b0a090] uppercase mb-2">Trace It (Print)</p>
        <div className="relative select-none" style={{ touchAction: "none" }}>
          <p
            className="pointer-events-none py-2 px-1"
            style={{
              fontFamily: "'Schoolbell', 'Comic Sans MS', cursive",
              fontSize: "3rem",
              lineHeight: 1.4,
              color: "rgba(0,0,0,0.10)",
              WebkitTextStroke: "1.5px rgba(0,0,0,0.22)",
              letterSpacing: "6px",
            }}
          >
            {word}
          </p>
          <DrawLayer mode={mode} onMount={reg("print")} />
        </div>
      </div>

      {/* Trace in Cursive */}
      <div className="px-6 pt-4 pb-5 border-b border-[#f0ebe5]">
        <p className="text-[10px] font-bold tracking-[0.15em] text-[#b0a090] uppercase mb-2">Trace It (Cursive)</p>
        <div className="relative select-none" style={{ touchAction: "none" }}>
          <p
            className="pointer-events-none py-2 px-1"
            style={{
              fontFamily: "'Dancing Script', cursive",
              fontWeight: 600,
              fontSize: "3rem",
              lineHeight: 1.5,
              color: "rgba(0,0,0,0.10)",
              WebkitTextStroke: "1px rgba(0,0,0,0.18)",
            }}
          >
            {word}
          </p>
          <DrawLayer mode={mode} onMount={reg("cursive")} />
        </div>
      </div>

      {/* Write it yourself */}
      <div className="px-6 pt-4 pb-6">
        <p className="text-[10px] font-bold tracking-[0.15em] text-[#b0a090] uppercase mb-3">Write It (your own)</p>
        <div className="relative select-none" style={{ touchAction: "none" }}>
          <div className="space-y-1 pointer-events-none">
            {[0, 1, 2].map((i) => (
              <div key={i} className="relative" style={{ height: "60px" }}>
                <div className="absolute top-0 left-0 right-0 h-px bg-[#c8c0b0]" />
                <div
                  className="absolute left-0 right-0 h-px"
                  style={{
                    top: "30px",
                    background: "repeating-linear-gradient(to right,#ddd5c8 0px,#ddd5c8 5px,transparent 5px,transparent 9px)",
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#c8c0b0]" />
              </div>
            ))}
          </div>
          <DrawLayer mode={mode} onMount={reg("write")} />
        </div>
      </div>
    </div>
  );
}

function SightWordPractice({ words, storyTitle }: { words: string[]; storyTitle?: string }) {
  const [mode, setMode] = useState<DrawMode>("draw");
  if (!words.length) return null;

  function printPracticeSheet() {
    const win = window.open("", "_blank", "width=820,height=700");
    if (!win) return;

    const cards = words.map(word => `
      <div class="card">
        <div class="word-label">${word.toUpperCase()}</div>
        <div class="section-label">✏️ Trace in Print</div>
        <div class="trace-row"><span class="trace-print">${word}</span></div>
        <div class="baseline"></div>
        <div class="section-label">✒️ Trace in Cursive</div>
        <div class="trace-row"><span class="trace-cursive">${word}</span></div>
        <div class="baseline"></div>
        <div class="section-label">✍️ Write it yourself</div>
        <div class="writing-area">
          <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
        </div>
      </div>`).join("");

    win.document.write(`<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <title>Word Practice Sheet${storyTitle ? ` – ${storyTitle}` : ""}</title>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Schoolbell&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:sans-serif;padding:24px;background:#fff;color:#111}
    h1{font-size:18px;color:#7c3aed;margin-bottom:4px}
    .subtitle{font-size:12px;color:#888;margin-bottom:24px}
    .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
    .card{border:1.5px solid #e5e7eb;border-radius:12px;padding:18px;break-inside:avoid}
    .word-label{font-size:11px;font-weight:700;color:#7c3aed;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px}
    .section-label{font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin:10px 0 4px}
    .trace-row{line-height:1}
    .trace-print{font-family:'Schoolbell','Comic Sans MS',cursive;font-size:52px;color:rgba(0,0,0,0.1);-webkit-text-stroke:1.5px rgba(0,0,0,0.22);letter-spacing:6px}
    .trace-cursive{font-family:'Dancing Script',cursive;font-weight:600;font-size:52px;color:rgba(0,0,0,0.1);-webkit-text-stroke:1px rgba(0,0,0,0.18)}
    .baseline{border-bottom:2px dashed #d1d5db;margin-top:4px}
    .writing-area{margin-top:4px}
    .line{height:44px;border-bottom:2px solid #374151;position:relative;margin-bottom:4px}
    .line::before{content:'';position:absolute;top:50%;left:0;right:0;border-top:1px dashed #d1d5db}
    @media print{body{padding:12px}}
  </style>
</head><body>
  <h1>✏️ Word Practice Sheet</h1>
  ${storyTitle ? `<div class="subtitle">Story: ${storyTitle}</div>` : ""}
  <div class="grid">${cards}</div>
</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 700);
  }

  return (
    <div className="border-t border-border/50 bg-[#fdf9f4] -mx-4 px-4 pt-8 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-bold text-[#1c2a3a] flex items-center gap-2 text-lg">
            <PenLine className="w-5 h-5 text-amber-600 shrink-0" /> ✏️ Word Practice
          </h3>
          <p className="text-sm text-[#7c6a5a] mt-1">Trace each word on screen, then write it yourself!</p>
        </div>
        <button
          onClick={printPracticeSheet}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-full text-sm font-semibold text-muted-foreground hover:bg-muted transition-all shrink-0"
        >
          🖨️ Print worksheet
        </button>
      </div>

      {/* Floating pen/eraser toolbar */}
      <div className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-5 flex items-center gap-1 px-2 py-2 rounded-2xl bg-white/90 backdrop-blur-md border border-[#e8dfd5] shadow-xl">
        <button
          onClick={() => setMode("draw")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
            mode === "draw"
              ? "bg-violet-600 text-white border-violet-600 shadow-sm"
              : "bg-transparent text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          <Pen className="w-3.5 h-3.5" /> Pen
        </button>
        <button
          onClick={() => setMode("erase")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
            mode === "erase"
              ? "bg-orange-500 text-white border-orange-500 shadow-sm"
              : "bg-transparent text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          <Eraser className="w-3.5 h-3.5" /> Eraser
        </button>
      </div>

      {/* One card per word */}
      {words.map((word) => (
        <WordDrawCard key={word} word={word} mode={mode} />
      ))}
    </div>
  );
}

// ── Comprehension exercise ────────────────────────────────────────────────────
function ComprehensionExercises({
  questions,
  onComplete,
  alreadyDone,
}: {
  questions: { question: string; answer: string; options: string[] }[];
  onComplete: (correct: number) => void;
  alreadyDone: boolean;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(alreadyDone);
  const [score, setScore] = useState<number | null>(null);

  function submit() {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i]?.toLowerCase() === q.answer.toLowerCase()) correct++;
    });
    setScore(correct);
    setSubmitted(true);
    onComplete(correct);
  }

  if (alreadyDone && score === null) {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-semibold">
        <CheckCircle className="w-4 h-4" /> Comprehension questions already completed!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <span className="text-xl">🧠</span> Comprehension Questions
      </h3>
      {questions.map((q, i) => (
        <div key={i} className="bg-muted/50 rounded-xl p-4 space-y-3">
          <p className="font-bold text-sm text-foreground">{i + 1}. {q.question}</p>
          <div className="grid grid-cols-1 gap-2">
            {q.options.map((opt) => {
              const selected = answers[i] === opt;
              const isCorrect = submitted && opt.toLowerCase() === q.answer.toLowerCase();
              const isWrong = submitted && selected && !isCorrect;
              return (
                <button
                  key={opt}
                  onClick={() => !submitted && setAnswers(prev => ({ ...prev, [i]: opt }))}
                  className={`px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all text-left
                    ${isCorrect ? "border-green-500 bg-green-50 text-green-800" :
                      isWrong ? "border-red-400 bg-red-50 text-red-700" :
                      selected ? "border-primary bg-primary/10 text-primary" :
                      "border-border bg-background hover:border-primary/50"}`}
                >
                  {opt}{isCorrect && " ✓"}{isWrong && " ✗"}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!submitted ? (
        <button
          onClick={submit}
          disabled={Object.keys(answers).length < questions.length}
          className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40"
        >
          Check my answers
        </button>
      ) : (
        <div className={`rounded-xl px-4 py-3 font-bold text-center
          ${score === questions.length ? "bg-green-50 border border-green-200 text-green-800" :
            "bg-blue-50 border border-blue-200 text-blue-800"}`}>
          {score === questions.length ? `🎉 All correct! ${score}/${questions.length}` : `${score}/${questions.length} correct — keep reading!`}
        </div>
      )}
    </div>
  );
}

// ── Full story reader ─────────────────────────────────────────────────────────
function StoryReader({
  storyId,
  onBack,
  studentFetch,
  onPointsEarned,
}: {
  storyId: number;
  onBack: () => void;
  studentFetch: any;
  onPointsEarned: (pts: number, label: string) => void;
}) {
  const [story, setStory] = useState<any>(null);
  const [completedTypes, setCompletedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alreadyRead, setAlreadyRead] = useState(false);

  // Exercises
  const [exercises, setExercises] = useState<any>(null);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [exercisesLoaded, setExercisesLoaded] = useState(false);
  const [exCompletedTypes, setExCompletedTypes] = useState<string[]>([]);

  // Build paragraphs for readAlong hook (empty until story loads)
  const paragraphs = story
    ? (story.content ?? "").split(/\n+/).map((p: string) => p.trim()).filter(Boolean)
    : [];

  // Use the battle-tested sentence-by-sentence hook — handles Chrome long-text bug + async voice loading
  const readAlong = useReadAlong(paragraphs);

  // Detect when reading finishes (activeRange → null after playing = done, not paused)
  const hasStartedRef = useRef(false);
  const alreadyReadRef = useRef(alreadyRead);
  alreadyReadRef.current = alreadyRead;

  useEffect(() => {
    if (readAlong.isPlaying) {
      hasStartedRef.current = true;
    } else if (hasStartedRef.current && readAlong.activeRange === null) {
      // Reading finished naturally (pausing keeps activeRange non-null)
      hasStartedRef.current = false;
      if (!alreadyReadRef.current) {
        studentFetch(`${basePath}/api/classroom/stories/${storyId}/read`, { method: "POST" })
          .then((r: any) => r.json())
          .then((d: any) => {
            if (d.pointsAwarded > 0) onPointsEarned(d.pointsAwarded, "for reading this story!");
            setAlreadyRead(true);
          })
          .catch(() => {});
      }
    }
  }, [readAlong.isPlaying, readAlong.activeRange]);

  useEffect(() => {
    studentFetch(`${basePath}/api/classroom/stories/${storyId}`)
      .then((r: any) => r.json())
      .then((d: any) => {
        if (d.story) {
          setStory(d.story);
          setAlreadyRead(d.alreadyRead ?? false);
          setCompletedTypes(d.completedExerciseTypes ?? []);
        } else {
          setError(d.error ?? "Not found");
        }
      })
      .catch(() => setError("Could not load story."))
      .finally(() => setLoading(false));

    return () => { readAlong.stop(); };
  }, [storyId]);

  async function loadExercises() {
    setExercisesLoading(true);
    try {
      const r = await studentFetch(`${basePath}/api/classroom/stories/${storyId}/exercises`);
      const d = await r.json();
      setExercises(d.exercises);
      setExCompletedTypes(d.completedTypes ?? []);
      setExercisesLoaded(true);
    } catch { /* silent */ }
    finally { setExercisesLoading(false); }
  }

  async function handleExerciseComplete(type: "sightwords" | "comprehension", correct: number) {
    if (exCompletedTypes.includes(type)) return;
    try {
      const r = await studentFetch(`${basePath}/api/classroom/stories/${storyId}/exercises/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseType: type, correctCount: correct }),
      });
      const d = await r.json();
      if (d.pointsAwarded > 0) {
        onPointsEarned(d.pointsAwarded,
          type === "sightwords" ? "for sight word exercises!" : "for comprehension questions!");
      }
      setExCompletedTypes(prev => [...prev, type]);
    } catch {}
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (error) return (
    <div className="text-center py-20 text-muted-foreground">
      <p>{error}</p>
      <button onClick={onBack} className="mt-4 text-primary font-semibold hover:underline text-sm">← Back</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-8 animate-in fade-in pb-24">
      {/* Back */}
      <button
        onClick={() => { readAlong.stop(); onBack(); }}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to stories
      </button>

      {/* Cover */}
      {story.cover_image_url && (
        <img src={toImgUrl(story.cover_image_url)!} alt={story.title} className="w-full rounded-3xl object-cover max-h-72 shadow-md" />
      )}

      {/* Title */}
      <h1 className="text-2xl font-serif font-bold text-foreground">{story.title}</h1>

      {/* Audio controls */}
      <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4">
        <Volume2 className="w-5 h-5 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground flex-1">Read aloud</span>
        <button
          onClick={readAlong.togglePlay}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all text-sm"
        >
          {readAlong.isPlaying
            ? <><Pause className="w-4 h-4 fill-white" /> Pause</>
            : <><Play className="w-4 h-4 fill-white" /> {readAlong.activeRange ? "Resume" : "Play"}</>}
        </button>
        {(readAlong.isPlaying || readAlong.activeRange !== null) && (
          <button
            onClick={readAlong.stop}
            className="p-2 rounded-full border border-border hover:bg-muted transition-all"
            title="Stop"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Story text with sentence highlighting */}
      <div className="space-y-4">
        {readAlong.paragraphData.length > 0
          ? readAlong.paragraphData.map((pd, i) => (
              <p key={i} className="text-foreground leading-relaxed text-lg font-serif">
                <HighlightedParagraph pd={pd} activeRange={readAlong.activeRange} />
              </p>
            ))
          : paragraphs.map((p: string, i: number) => (
              <p key={i} className="text-foreground leading-relaxed text-lg font-serif">{p}</p>
            ))
        }
      </div>

      {/* "Already read" badge */}
      {alreadyRead && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 font-semibold">
          <CheckCircle className="w-4 h-4" /> You've read this story
        </div>
      )}

      {/* Writing exercises */}
      <div className="border-t border-border/60 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Writing Exercises
          </h2>
          {!exercisesLoaded && (
            <button
              onClick={loadExercises}
              disabled={exercisesLoading}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white font-bold rounded-full text-sm hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {exercisesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {exercisesLoading ? "Loading…" : "Start exercises"}
            </button>
          )}
        </div>

        {exercisesLoaded && exercises && (
          <div className="space-y-8">
            {exercises.sightWordExercises?.length > 0 && (
              <SightWordExercises
                exercises={exercises.sightWordExercises}
                alreadyDone={exCompletedTypes.includes("sightwords") || completedTypes.includes("sightwords")}
                onComplete={(c) => handleExerciseComplete("sightwords", c)}
              />
            )}
            {exercises.comprehensionQuestions?.length > 0 && (
              <ComprehensionExercises
                questions={exercises.comprehensionQuestions}
                alreadyDone={exCompletedTypes.includes("comprehension") || completedTypes.includes("comprehension")}
                onComplete={(c) => handleExerciseComplete("comprehension", c)}
              />
            )}
            {exercises.sightWords?.length > 0 && (
              <SightWordPractice
                words={exercises.sightWords}
                storyTitle={story?.title}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Write a Story form ────────────────────────────────────────────────────────
function WriteStoryForm({ studentFetch, sightWords, onSubmitted }: {
  studentFetch: any; sightWords: string[]; onSubmitted: () => void;
}) {
  const [step, setStep] = useState<"avatar" | "prompt">("avatar");
  const [selectedAvatars, setSelectedAvatars] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!prompt.trim()) return;
    setSubmitting(true); setError("");
    try {
      const r = await studentFetch(`${basePath}/api/classroom/student-stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          avatarPaths: selectedAvatars,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setDone(true);
      setTimeout(() => { onSubmitted(); }, 1500);
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  if (done) return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
      <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
      <div>
        <p className="font-bold text-green-800">Story submitted!</p>
        <p className="text-green-700 text-sm">Your teacher will review it soon.</p>
      </div>
    </div>
  );

  return (
    <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-5 space-y-5">
      <h3 className="font-serif font-bold text-lg text-foreground flex items-center gap-2">
        <PenLine className="w-5 h-5 text-primary" /> Write a Story
      </h3>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setStep("avatar")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
            step === "avatar"
              ? "bg-primary text-white border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/40"
          }`}
        >
          <span>1.</span> Pick your character
        </button>
        <span className="text-muted-foreground/40">→</span>
        <button
          type="button"
          onClick={() => setStep("prompt")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
            step === "prompt"
              ? "bg-primary text-white border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/40"
          }`}
        >
          <span>2.</span> Write your story
        </button>
      </div>

      {/* Step 1 — Avatar picker */}
      {step === "avatar" && (
        <div className="space-y-4">
          <AvatarPicker
            selected={selectedAvatars}
            onChange={setSelectedAvatars}
            maxSelect={2}
            basePath={basePath}
          />
          <button
            type="button"
            onClick={() => setStep("prompt")}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all text-sm"
          >
            {selectedAvatars.length > 0 ? `Continue with ${selectedAvatars.length} character${selectedAvatars.length > 1 ? "s" : ""}` : "Skip — no character image"} →
          </button>
        </div>
      )}

      {/* Step 2 — Story prompt */}
      {step === "prompt" && (
        <div className="space-y-4">
          {/* Selected avatars reminder */}
          {selectedAvatars.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-primary font-semibold bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
              <span>✨</span>
              {selectedAvatars.length} character image{selectedAvatars.length > 1 ? "s" : ""} selected — AI will illustrate your story
              <button
                type="button"
                onClick={() => setStep("avatar")}
                className="ml-auto text-primary/60 hover:text-primary underline"
              >
                Change
              </button>
            </div>
          )}

          {/* Sight words */}
          {sightWords.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Include these sight words:</p>
              <div className="flex flex-wrap gap-1.5">
                {sightWords.map(w => (
                  <span key={w} className="px-2.5 py-1 bg-primary text-white text-xs font-bold rounded-lg">{w}</span>
                ))}
              </div>
            </div>
          )}

          <textarea
            rows={3}
            placeholder="What is your story about? (e.g. 'A brave dog who helps find a lost kitten')"
            value={prompt}
            onChange={e => { setPrompt(e.target.value); setError(""); }}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            autoFocus
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting || !prompt.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? "Writing your story…" : "Submit story"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Classroom home ─────────────────────────────────────────────────────────────
export default function ClassroomHome() {
  const { student, studentFetch, signOutStudent } = useStudentAuth();
  const [, navigate] = useLocation();
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [points, setPoints] = useState<number>(0);
  const [toast, setToast] = useState<{ pts: number; label: string } | null>(null);

  useEffect(() => {
    if (!student) { navigate("/student-login"); }
  }, [student]);

  useEffect(() => {
    if (!student) return;
    studentFetch(`${basePath}/api/classroom/stories`)
      .then((r: any) => r.json())
      .then((d: any) => setStories(d.stories ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    studentFetch(`${basePath}/api/classroom/announcement`)
      .then((r: any) => r.json())
      .then((d: any) => setAnnouncement(d))
      .catch(() => {});
    studentFetch(`${basePath}/api/classroom/me`)
      .then((r: any) => r.json())
      .then((d: any) => { if (d.points != null) setPoints(d.points); })
      .catch(() => {});
  }, [student]);

  function handlePointsEarned(pts: number, label: string) {
    setPoints(prev => prev + pts);
    setToast({ pts, label });
  }

  if (!student) return null;

  if (selectedStory !== null) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <button
              onClick={() => setSelectedStory(null)}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" /> Stories
            </button>
            <div className="flex items-center gap-1.5 bg-yellow-100 text-yellow-800 font-bold text-sm px-3 py-1 rounded-full">
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
              {points}
            </div>
          </div>
        </header>
        <StoryReader
          storyId={selectedStory}
          onBack={() => setSelectedStory(null)}
          studentFetch={studentFetch}
          onPointsEarned={handlePointsEarned}
        />
        {toast && <PointsToast points={toast.pts} label={toast.label} onDone={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{student.avatar}</span>
            <div>
              <p className="font-bold text-foreground leading-tight">{student.firstName}</p>
              <p className="text-xs text-muted-foreground leading-tight">{student.className}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-yellow-100 text-yellow-800 font-bold text-sm px-3 py-1.5 rounded-full">
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
              {points} {points === 1 ? "point" : "points"}
            </div>
            <button
              onClick={() => { signOutStudent(); navigate("/student-login"); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold text-foreground">Welcome, {student.firstName}! 👋</h1>
        </div>

        {/* Weekly announcement */}
        {announcement && (announcement.message || announcement.valueOfWeek || announcement.sightWords) && (
          <div className="mb-8 bg-primary/5 border-2 border-primary/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">📣</span>
              <h2 className="font-serif font-bold text-lg text-foreground">This Week</h2>
              {announcement.dueDate && (
                <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />
                  Due {new Date(announcement.dueDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </span>
              )}
            </div>
            {announcement.message && <p className="text-foreground leading-relaxed text-sm">{announcement.message}</p>}
            <div className="flex flex-wrap gap-3">
              {announcement.valueOfWeek && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5">
                  <span className="text-xl">💛</span>
                  <div>
                    <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide">Value of the Week</p>
                    <p className="font-bold text-foreground">{announcement.valueOfWeek}</p>
                  </div>
                </div>
              )}
            </div>
            {announcement.sightWords && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">🔤 Sight Words</p>
                <div className="flex flex-wrap gap-2">
                  {announcement.sightWords.split(",").map((w: string) => w.trim()).filter(Boolean).map((word: string) => (
                    <span key={word} className="px-3 py-1.5 bg-primary text-white text-sm font-bold rounded-lg">{word}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Write a Story */}
        {showWriteForm ? (
          <div className="mb-8">
            <button onClick={() => setShowWriteForm(false)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
              <X className="w-3 h-3" /> Cancel
            </button>
            <WriteStoryForm
              studentFetch={studentFetch}
              sightWords={announcement?.sightWords?.split(",").map((w: string) => w.trim()).filter(Boolean) ?? []}
              onSubmitted={() => { setShowWriteForm(false); }}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowWriteForm(true)}
            className="mb-8 w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-primary/40 text-primary font-bold rounded-2xl hover:bg-primary/5 hover:border-primary transition-all"
          >
            <PenLine className="w-5 h-5" /> Write a story
          </button>
        )}

        <div className="mb-6">
          <h2 className="font-serif font-bold text-lg text-foreground">Class Stories</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Tap a story to read, listen, and earn points! 🌟</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : stories.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No stories yet!</p>
            <p className="text-sm mt-1">Your teacher hasn't added any stories to this class yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {stories.map((s: any) => (
              <button
                key={s.id}
                onClick={() => setSelectedStory(s.id)}
                className="group flex flex-col rounded-2xl overflow-hidden border-2 border-border hover:border-primary bg-card transition-all hover:shadow-lg active:scale-95 text-left"
              >
                {s.cover_image_url ? (
                  <img src={toImgUrl(s.cover_image_url)!} alt={s.title} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-primary/40" />
                  </div>
                )}
                <div className="p-3">
                  <p className="font-bold text-foreground text-sm leading-tight line-clamp-2 font-serif">{s.title ?? "Untitled story"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.child_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {toast && <PointsToast points={toast.pts} label={toast.label} onDone={() => setToast(null)} />}
    </div>
  );
}
