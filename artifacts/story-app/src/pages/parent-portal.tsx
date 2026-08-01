import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, BookOpen, Star, Calendar, Link2, ChevronDown, ChevronUp, User } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${basePath}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    credentials: "include",
  });
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error ?? "Request failed"); }
  return r.json();
}

// ── Link form ─────────────────────────────────────────────────────────────────
function LinkChildForm({ onLinked }: { onLinked: () => void }) {
  const [step, setStep] = useState<"code" | "pick">("code");
  const [code, setCode] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();

  async function lookupCode() {
    if (!code.trim()) return;
    setLoading(true); setError("");
    try {
      const d = await apiFetch(`/api/classroom/parent/class-students?code=${encodeURIComponent(code.trim().toUpperCase())}`);
      setStudents(d.students ?? []);
      setStep("pick");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const link = useMutation({
    mutationFn: (studentId: string) => apiFetch("/api/classroom/parent/link", {
      method: "POST",
      body: JSON.stringify({ classCode: code.trim().toUpperCase(), studentId }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["parent-dashboard"] }); onLinked(); },
  });

  if (step === "pick") return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4 max-w-sm mx-auto">
      <h3 className="font-serif font-bold text-lg text-foreground">Which child is yours?</h3>
      <p className="text-sm text-muted-foreground">Tap your child's name to link your account.</p>
      {students.length === 0 && <p className="text-muted-foreground text-sm">No students found in this class yet.</p>}
      <div className="space-y-2">
        {students.map((s: any) => (
          <button
            key={s.id}
            onClick={() => link.mutate(s.id)}
            disabled={link.isPending}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left disabled:opacity-50"
          >
            <span className="text-2xl">{s.avatar}</span>
            <span className="font-semibold text-foreground">{s.first_name}</span>
            {link.isPending && <Loader2 className="w-4 h-4 animate-spin ml-auto text-primary" />}
          </button>
        ))}
      </div>
      <button onClick={() => setStep("code")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Try a different code</button>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4 max-w-sm mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🏫</span>
        <div>
          <h3 className="font-serif font-bold text-lg text-foreground">Connect to your child's class</h3>
          <p className="text-sm text-muted-foreground">Ask their teacher for the class code.</p>
        </div>
      </div>
      <input
        type="text"
        placeholder="Class code (e.g. ABC123)"
        value={code}
        onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
        onKeyDown={e => e.key === "Enter" && lookupCode()}
        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground font-mono text-lg font-bold tracking-widest uppercase text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
        maxLength={8}
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <button
        onClick={lookupCode}
        disabled={loading || !code.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
        Find class
      </button>
    </div>
  );
}

// ── Child dashboard card ──────────────────────────────────────────────────────
function ChildCard({ child }: { child: any }) {
  const [storyOpen, setStoryOpen] = useState<number | null>(null);
  const [classStoriesOpen, setClassStoriesOpen] = useState(false);

  const ann = child.announcement;
  const sightWords: string[] = ann?.sight_words
    ? ann.sight_words.split(",").map((w: string) => w.trim()).filter(Boolean)
    : [];

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 bg-primary/5 border-b border-border/40">
        <span className="text-4xl">{child.avatar}</span>
        <div className="flex-1">
          <h2 className="font-serif font-bold text-xl text-foreground">{child.first_name}</h2>
          <p className="text-sm text-muted-foreground">{child.class_name}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-full">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="font-bold text-yellow-700 text-sm">{child.points ?? 0} pts</span>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Weekly announcement */}
        {ann && (ann.announcement_message || ann.value_of_week || sightWords.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📣</span>
              <h3 className="font-bold text-amber-900">This Week</h3>
              {ann.assignment_due_date && (
                <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />
                  Due {new Date(ann.assignment_due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
            {ann.announcement_message && <p className="text-amber-800 text-sm leading-relaxed">{ann.announcement_message}</p>}
            {ann.value_of_week && (
              <p className="text-sm font-semibold text-amber-800">✨ Value: <span className="text-amber-900">{ann.value_of_week}</span></p>
            )}
            {sightWords.length > 0 && (
              <div>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1.5">🔤 Sight Words</p>
                <div className="flex flex-wrap gap-1.5">
                  {sightWords.map(w => (
                    <span key={w} className="px-2.5 py-1 bg-primary text-white text-xs font-bold rounded-lg">{w}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Child's own stories */}
        <div>
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> {child.first_name}'s Stories
          </h3>
          {child.my_stories?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stories published yet.</p>
          ) : (
            <div className="space-y-2">
              {(child.my_stories ?? []).map((s: any) => (
                <div key={s.id} className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setStoryOpen(storyOpen === s.id ? null : s.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <BookOpen className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-semibold text-sm text-foreground flex-1 font-serif">{s.title}</span>
                    {s.story_status === "pending" && (
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pending review</span>
                    )}
                    {storyOpen === s.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  {storyOpen === s.id && (
                    <div className="px-4 pb-4 pt-1 text-sm text-foreground leading-relaxed border-t border-border/40 whitespace-pre-wrap font-serif">
                      {s.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All class stories */}
        <div>
          <button
            onClick={() => setClassStoriesOpen(v => !v)}
            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <BookOpen className="w-4 h-4" />
            All Class Stories ({child.class_stories?.length ?? 0})
            {classStoriesOpen ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
          </button>
          {classStoriesOpen && (
            <div className="mt-3 space-y-2">
              {(child.class_stories ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground pl-6">No class stories yet.</p>
              ) : (
                (child.class_stories ?? []).map((s: any) => (
                  <div key={s.id} className="border border-border rounded-xl overflow-hidden ml-6">
                    <button
                      onClick={() => setStoryOpen(storyOpen === s.id ? null : s.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
                    >
                      <span className="text-base">{s.student_avatar ?? "📖"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground font-serif truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.student_name ?? s.child_name}</p>
                      </div>
                      {storyOpen === s.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                    </button>
                    {storyOpen === s.id && (
                      <div className="px-4 pb-4 pt-1 text-sm text-foreground leading-relaxed border-t border-border/40 whitespace-pre-wrap font-serif">
                        {s.content}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Parent portal ─────────────────────────────────────────────────────────────
export default function ParentPortal() {
  const { getToken } = useAuth();
  const [showLink, setShowLink] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["parent-dashboard"],
    queryFn: () => apiFetch("/api/classroom/parent/dashboard"),
  });

  const children: any[] = data?.children ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Parent Portal</h1>
          <p className="text-muted-foreground mt-1">Follow along with your child's classroom journey.</p>
        </div>
        <button
          onClick={() => setShowLink(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-full text-sm font-semibold text-foreground hover:bg-muted/50 transition-all"
        >
          <Link2 className="w-3.5 h-3.5" /> Add child
        </button>
      </div>

      {showLink && (
        <LinkChildForm onLinked={() => { setShowLink(false); refetch(); }} />
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : children.length === 0 && !showLink ? (
        <div className="text-center py-20 space-y-4">
          <span className="text-6xl block">👨‍👧</span>
          <h2 className="font-serif font-bold text-xl text-foreground">No children linked yet</h2>
          <p className="text-muted-foreground">Ask your child's teacher for their class code, then tap "Add child" above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {children.map((c: any) => <ChildCard key={c.id} child={c} />)}
        </div>
      )}
    </div>
  );
}
