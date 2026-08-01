/**
 * ClassroomSection — renders inside the teacher's Account page.
 * Manages classes and student rosters entirely via /api/classroom/* routes.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp,
  Loader2, Eye, EyeOff, Copy, Check, Lock,
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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["classroom-class", cls.id],
    queryFn: () => apiFetch(`/api/classroom/classes/${cls.id}`),
    enabled: open,
  });

  const students: any[] = data?.students ?? [];

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
