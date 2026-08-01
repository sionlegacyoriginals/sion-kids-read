import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Loader2, BookOpen, Star, Calendar, PenLine, Send, X, CheckCircle, Clock, XCircle } from "lucide-react";
import { useStudentAuth } from "@/lib/studentAuth";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Simple story reader (student view) ───────────────────────────────────────
function StoryReader({ storyId, onBack }: { storyId: number; onBack: () => void }) {
  const { studentFetch } = useStudentAuth();
  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    studentFetch(`${basePath}/api/classroom/stories/${storyId}`)
      .then(r => r.json())
      .then(d => { if (d.story) setStory(d.story); else setError(d.error ?? "Not found"); })
      .catch(() => setError("Could not load story."))
      .finally(() => setLoading(false));
  }, [storyId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (error) return (
    <div className="text-center py-20 text-muted-foreground">
      <p>{error}</p>
      <button onClick={onBack} className="mt-4 text-primary font-semibold hover:underline text-sm">← Back</button>
    </div>
  );

  const paragraphs: string[] = (story.content ?? "")
    .split(/\n+/)
    .map((p: string) => p.trim())
    .filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6 animate-in fade-in">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Back to stories
      </button>

      {story.cover_image_url && (
        <img src={story.cover_image_url} alt={story.title} className="w-full rounded-3xl object-cover max-h-72" />
      )}

      <h1 className="text-2xl font-serif font-bold text-foreground">{story.title}</h1>

      <div className="space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-foreground leading-relaxed text-lg font-serif">{p}</p>
        ))}
      </div>
    </div>
  );
}

// ── Write a Story form ────────────────────────────────────────────────────────
function WriteStoryForm({ studentFetch, sightWords, onSubmitted }: {
  studentFetch: any; sightWords: string[]; onSubmitted: () => void;
}) {
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
        body: JSON.stringify({ prompt: prompt.trim() }),
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
    <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-5 space-y-4">
      <h3 className="font-serif font-bold text-lg text-foreground flex items-center gap-2">
        <PenLine className="w-5 h-5 text-primary" /> Write a Story
      </h3>
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

  // Redirect if not logged in as student
  useEffect(() => {
    if (!student) { navigate("/student-login"); }
  }, [student]);

  useEffect(() => {
    if (!student) return;
    studentFetch(`${basePath}/api/classroom/stories`)
      .then(r => r.json())
      .then(d => setStories(d.stories ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    studentFetch(`${basePath}/api/classroom/announcement`)
      .then(r => r.json())
      .then(d => setAnnouncement(d))
      .catch(() => {});
  }, [student]);

  if (!student) return null;

  if (selectedStory !== null) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <StoryReader storyId={selectedStory} onBack={() => setSelectedStory(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Student header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{student.avatar}</span>
            <div>
              <p className="font-bold text-foreground leading-tight">{student.firstName}</p>
              <p className="text-xs text-muted-foreground leading-tight">{student.className}</p>
            </div>
          </div>
          <button
            onClick={() => { signOutStudent(); navigate("/student-login"); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold text-foreground">
            Welcome, {student.firstName}! 👋
          </h1>
        </div>

        {/* Weekly announcement card */}
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

            {announcement.message && (
              <p className="text-foreground leading-relaxed text-sm">{announcement.message}</p>
            )}

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
                    <span key={word} className="px-3 py-1.5 bg-primary text-white text-sm font-bold rounded-lg">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Write a Story */}
        {announcement?.sightWords || announcement?.valueOfWeek ? (
          showWriteForm ? (
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
              <PenLine className="w-5 h-5" /> Write a story for this week
            </button>
          )
        ) : null}

        <div className="mb-6">
          <h2 className="font-serif font-bold text-lg text-foreground">Class Stories</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Tap a story to read!</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
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
                  <img
                    src={s.cover_image_url}
                    alt={s.title}
                    className="w-full h-36 object-cover"
                  />
                ) : (
                  <div className="w-full h-36 bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-primary/40" />
                  </div>
                )}
                <div className="p-3">
                  <p className="font-bold text-foreground text-sm leading-tight line-clamp-2 font-serif">
                    {s.title ?? "Untitled story"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{s.child_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
