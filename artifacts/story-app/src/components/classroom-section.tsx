/**
 * ClassroomSection — renders inside the teacher's Account page.
 * Manages classes and student rosters entirely via /api/classroom/* routes.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp,
  Loader2, Eye, EyeOff, Copy, Check, Lock, Megaphone, Save, X,
} from "lucide-react";

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: "include", ...opts });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Request failed");
  return d;
}

// ── Single class panel ────────────────────────────────────────────────────────
function ClassPanel({ cls }: { cls: any }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [resetPins, setResetPins] = useState<Record<string, string>>({});

  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [ann, setAnn] = useState({ message: "", valueOfWeek: "", sightWords: "", dueDate: "", pointValuePerSightWord: "1", pointsForPublished: "5" });
  const [annSaved, setAnnSaved] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["classroom-class", cls.id],
    queryFn: () => apiFetch(`/api/classroom/classes/${cls.id}`),
    enabled: open,
  });

  const students: any[] = data?.students ?? [];

  // Pre-fill announcement form from fetched class data
  const clsData = data?.class;
  useState(() => {
    if (clsData) setAnn({
      message:                clsData.announcement_message         ?? "",
      valueOfWeek:            clsData.value_of_week               ?? "",
      sightWords:             clsData.sight_words                 ?? "",
      dueDate:                clsData.assignment_due_date          ? clsData.assignment_due_date.split("T")[0] : "",
      pointValuePerSightWord: String(clsData.point_value_per_sight_word ?? 1),
      pointsForPublished:     String(clsData.points_for_published ?? 5),
    });
  });

  const saveAnnouncement = useMutation({
    mutationFn: () => apiFetch(`/api/classroom/classes/${cls.id}/announcement`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:               ann.message     || null,
        valueOfWeek:           ann.valueOfWeek || null,
        sightWords:            ann.sightWords  || null,
        dueDate:               ann.dueDate     || null,
        pointValuePerSightWord: Number(ann.pointValuePerSightWord) || 1,
        pointsForPublished:     Number(ann.pointsForPublished)     || 5,
      }),
    }),
    onSuccess: () => { setAnnSaved(true); setTimeout(() => setAnnSaved(false), 2000); refetch(); },
  });

  const pendingStories = useQuery({
    queryKey: ["classroom-pending", cls.id],
    queryFn: () => apiFetch("/api/classroom/pending-stories"),
    enabled: open,
    select: (d: any) => (d.stories ?? []).filter((s: any) => {
      // only show pending stories for this class
      return s.class_id === cls.id;
    }),
  });

  const approveStory = useMutation({
    mutationFn: (storyId: number) =>
      apiFetch(`/api/classroom/pending-stories/${storyId}/approve`, { method: "POST" }),
    onSuccess: () => { pendingStories.refetch(); qc.invalidateQueries({ queryKey: ["classroom-class", cls.id] }); },
  });

  const rejectStory = useMutation({
    mutationFn: (storyId: number) =>
      apiFetch(`/api/classroom/pending-stories/${storyId}/reject`, { method: "POST" }),
    onSuccess: () => pendingStories.refetch(),
  });

  const addStudent = useMutation({
    mutationFn: (firstName: string) =>
      apiFetch(`/api/classroom/classes/${cls.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName }),
      }),
    onSuccess: () => { setNewName(""); setAddError(""); refetch(); },
    onError: (e: any) => setAddError(e.message),
  });

  const removeStudent = useMutation({
    mutationFn: (studentId: string) =>
      apiFetch(`/api/classroom/classes/${cls.id}/students/${studentId}`, { method: "DELETE" }),
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ["classroom-classes"] }); },
  });

  const resetPin = useMutation({
    mutationFn: (studentId: string) =>
      apiFetch(`/api/classroom/classes/${cls.id}/students/${studentId}/reset-pin`, { method: "POST" }),
    onSuccess: (d, studentId) => {
      setResetPins(p => ({ ...p, [studentId]: d.pin }));
      refetch();
    },
  });

  function copyCode() {
    navigator.clipboard.writeText(cls.class_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="border border-border/60 rounded-2xl overflow-hidden">
      {/* Class header row */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        <GraduationCap className="w-5 h-5 text-primary shrink-0" />
        <span className="font-bold text-foreground flex-1">{cls.class_name}</span>
        {/* Class code badge */}
        <span
          onClick={e => { e.stopPropagation(); copyCode(); }}
          className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-sm font-mono font-bold rounded-full hover:bg-primary/20 transition-colors cursor-pointer select-all"
          title="Click to copy class code"
        >
          {cls.class_code}
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3 h-3 opacity-60" />}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">{cls.student_count ?? 0} students</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-5 py-4 space-y-4 bg-card">

          {/* Weekly Announcement */}
          <div className="border border-primary/20 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowAnnouncement(v => !v)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
            >
              <Megaphone className="w-4 h-4 text-primary shrink-0" />
              <span className="font-bold text-sm text-foreground flex-1">Weekly Message to Students</span>
              {showAnnouncement ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {showAnnouncement && (
              <div className="px-4 py-4 space-y-3 bg-card">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">Message / Instructions</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. This week we're learning about kindness. Write a story using all the sight words below. Stories are due Thursday!"
                    value={ann.message}
                    onChange={e => setAnn(a => ({ ...a, message: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">💛 Value of the Week</label>
                    <input
                      type="text"
                      placeholder="e.g. Kindness"
                      value={ann.valueOfWeek}
                      onChange={e => setAnn(a => ({ ...a, valueOfWeek: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">📅 Due Date</label>
                    <input
                      type="date"
                      value={ann.dueDate}
                      onChange={e => setAnn(a => ({ ...a, dueDate: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">🔤 Sight Words (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. said, were, they, from, have, one"
                    value={ann.sightWords}
                    onChange={e => setAnn(a => ({ ...a, sightWords: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {/* Point config */}
                <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">⭐ Points per sight word</label>
                    <input
                      type="number" min="0" max="100"
                      value={ann.pointValuePerSightWord}
                      onChange={e => setAnn(a => ({ ...a, pointValuePerSightWord: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">🏆 Bonus for getting published</label>
                    <input
                      type="number" min="0" max="100"
                      value={ann.pointsForPublished}
                      onChange={e => setAnn(a => ({ ...a, pointsForPublished: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => saveAnnouncement.mutate()}
                    disabled={saveAnnouncement.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {saveAnnouncement.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {annSaved ? "Saved!" : "Save & Post"}
                  </button>
                  <button
                    onClick={() => setAnn({ message: "", valueOfWeek: "", sightWords: "", dueDate: "", pointValuePerSightWord: "1", pointsForPublished: "5" })}
                    className="flex items-center gap-1.5 px-3 py-2 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted/50 transition-all"
                  >
                    <X className="w-4 h-4" /> Clear
                  </button>
                  <span className="text-xs text-muted-foreground ml-auto">Students see this when they log in</span>
                </div>
              </div>
            )}
          </div>

          {/* Pending student stories */}
          {pendingStories.data && pendingStories.data.length > 0 && (
            <div className="border border-amber-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50">
                <span className="text-base">📥</span>
                <span className="font-bold text-sm text-amber-800 flex-1">
                  Stories to Review ({pendingStories.data.length})
                </span>
              </div>
              <div className="divide-y divide-border/40">
                {pendingStories.data.map((s: any) => (
                  <div key={s.id} className="px-4 py-3 bg-card space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{s.student_avatar}</span>
                      <span className="font-semibold text-sm text-foreground">{s.student_name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="font-serif font-bold text-sm text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{s.content}</p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => approveStory.mutate(s.id)}
                        disabled={approveStory.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-all disabled:opacity-50"
                      >
                        {approveStory.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "✓"} Approve & award points
                      </button>
                      <button
                        onClick={() => rejectStory.mutate(s.id)}
                        disabled={rejectStory.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        ✕ Return
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add student */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Student first name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && newName.trim() && addStudent.mutate(newName.trim())}
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => newName.trim() && addStudent.mutate(newName.trim())}
              disabled={addStudent.isPending || !newName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {addStudent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </div>
          {addError && <p className="text-destructive text-xs">{addError}</p>}

          {/* Student list */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-3">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading students…
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No students yet — add one above!</p>
          ) : (
            <div className="space-y-2">
              {students.map((s: any) => {
                const displayPin = resetPins[s.id] ?? s.pin;
                const pinVisible = showPins[s.id];
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-muted/30 border border-border/40"
                  >
                    <span className="text-2xl leading-none shrink-0">{s.avatar}</span>
                    <span className="font-semibold text-foreground text-sm flex-1">{s.first_name}</span>
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-yellow-50 border border-yellow-200 rounded-full text-xs font-bold text-yellow-700 shrink-0">
                      ⭐ {s.points ?? 0}
                    </span>

                    {/* PIN display */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">PIN:</span>
                      <span className="font-mono text-sm font-bold text-foreground w-10 text-center">
                        {pinVisible ? displayPin : "••••"}
                      </span>
                      <button
                        onClick={() => setShowPins(p => ({ ...p, [s.id]: !p[s.id] }))}
                        className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title={pinVisible ? "Hide PIN" : "Show PIN"}
                      >
                        {pinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Reset PIN */}
                    <button
                      onClick={() => resetPin.mutate(s.id)}
                      disabled={resetPin.isPending}
                      className="p-1.5 rounded-lg hover:bg-amber-100 text-muted-foreground hover:text-amber-600 transition-colors shrink-0"
                      title="Reset PIN"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => removeStudent.mutate(s.id)}
                      disabled={removeStudent.isPending}
                      className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                      title="Remove student"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Access gate ───────────────────────────────────────────────────────────────
function ClassroomAccessGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const unlock = useMutation({
    mutationFn: () =>
      apiFetch("/api/classroom/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      }),
    onSuccess: () => { setError(""); onUnlocked(); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-8 flex flex-col items-center text-center gap-5">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Lock className="w-7 h-7 text-primary" />
      </div>
      <div>
        <h2 className="font-serif font-bold text-xl text-foreground mb-1">Classroom Access Required</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          The classroom feature is for approved teachers. Enter the teacher access code you received to get started.
        </p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <input
          type="text"
          placeholder="Enter your teacher access code"
          value={code}
          onChange={e => { setCode(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && code.trim() && unlock.mutate()}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm text-center tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
          autoComplete="off"
        />
        {error && <p className="text-destructive text-xs">{error}</p>}
        <button
          onClick={() => unlock.mutate()}
          disabled={unlock.isPending || !code.trim()}
          className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {unlock.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock Classroom"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Don't have a code? Contact <strong>Sion Legacy Originals</strong> to request teacher access.
      </p>
    </div>
  );
}

// ── Main classroom section ────────────────────────────────────────────────────
export function ClassroomSection() {
  const qc = useQueryClient();
  const [newClassName, setNewClassName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState("");

  const { data: accessData, isLoading: accessLoading, refetch: refetchAccess } = useQuery({
    queryKey: ["classroom-access"],
    queryFn: () => apiFetch("/api/classroom/access-status"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["classroom-classes"],
    queryFn: () => apiFetch("/api/classroom/classes"),
    enabled: accessData?.enabled === true,
  });

  const classes: any[] = data?.classes ?? [];

  const createClass = useMutation({
    mutationFn: (className: string) =>
      apiFetch("/api/classroom/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ className }),
      }),
    onSuccess: () => {
      setNewClassName(""); setShowCreate(false); setCreateError("");
      qc.invalidateQueries({ queryKey: ["classroom-classes"] });
    },
    onError: (e: any) => setCreateError(e.message),
  });

  if (accessLoading) {
    return (
      <div className="bg-card border border-border/60 rounded-2xl p-8 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Checking access…
      </div>
    );
  }

  if (!accessData?.enabled) {
    return <ClassroomAccessGate onUnlocked={() => { refetchAccess(); qc.invalidateQueries({ queryKey: ["classroom-classes"] }); }} />;
  }

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-lg text-foreground flex-1">My Classrooms</h2>
        <button
          onClick={() => { setShowCreate(v => !v); setCreateError(""); }}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-full hover:bg-primary/90 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> New class
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        Create a class and add students by first name only — no email needed.
        Students log in using the class code + their 4-digit PIN.
      </p>

      {/* Create new class form */}
      {showCreate && (
        <div className="flex gap-2 pt-1">
          <input
            autoFocus
            type="text"
            placeholder="Class name (e.g. Mrs. Smith's 2nd Grade)"
            value={newClassName}
            onChange={e => setNewClassName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && newClassName.trim() && createClass.mutate(newClassName.trim())}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={() => newClassName.trim() && createClass.mutate(newClassName.trim())}
            disabled={createClass.isPending || !newClassName.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {createClass.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
          </button>
        </div>
      )}
      {createError && <p className="text-destructive text-xs">{createError}</p>}

      {/* Class list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading classes…
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-25" />
          <p className="text-sm">No classes yet — create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls: any) => (
            <ClassPanel key={cls.id} cls={cls} />
          ))}
        </div>
      )}
    </div>
  );
}
