import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Loader2, BookOpen } from "lucide-react";
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

// ── Classroom home ─────────────────────────────────────────────────────────────
export default function ClassroomHome() {
  const { student, studentFetch, signOutStudent } = useStudentAuth();
  const [, navigate] = useLocation();
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<number | null>(null);

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
        <div className="mb-8">
          <h1 className="text-2xl font-serif font-bold text-foreground">
            Welcome, {student.firstName}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here are your class stories. Tap one to read!</p>
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
