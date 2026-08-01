import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, School } from "lucide-react";
import { useStudentAuth, type StudentSession } from "@/lib/studentAuth";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Step 1: Enter class code ──────────────────────────────────────────────────
function ClassCodeStep({ onFound }: {
  onFound: (data: { class: any; students: any[] }) => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 5) { setError("Class codes are 5 characters long."); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`${basePath}/api/classroom/lookup/${trimmed}`);
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Class not found. Check the code and try again."); return; }
      onFound(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <School className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Student Login</h1>
        <p className="text-muted-foreground">Ask your teacher for the 5-letter class code</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          autoFocus
          maxLength={5}
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          placeholder="e.g. SION7"
          className="w-full px-5 py-4 text-center text-3xl font-mono font-bold tracking-[0.4em] rounded-2xl border-2 border-border bg-background text-foreground focus:outline-none focus:border-primary transition-colors uppercase"
        />
        {error && <p className="text-destructive text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.length < 5}
          className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl text-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Find My Class →"}
        </button>
      </form>
    </div>
  );
}

// ── PIN entry modal ───────────────────────────────────────────────────────────
function PinModal({
  student,
  onCancel,
  onSuccess,
}: {
  student: { id: string; first_name: string; avatar: string };
  onCancel: () => void;
  onSuccess: (session: StudentSession) => void;
}) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`${basePath}/api/classroom/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, pin }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Wrong PIN. Try again."); setPin(""); inputRef.current?.focus(); return; }
      onSuccess({ token: data.token, ...data.student });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-card border border-border rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center space-y-5">
        <div className="text-6xl">{student.avatar}</div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Hi, {student.first_name}!</h2>
          <p className="text-muted-foreground text-sm mt-1">Enter your 4-digit PIN</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={inputRef}
            autoFocus
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
            className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono rounded-2xl border-2 border-border bg-background text-foreground focus:outline-none focus:border-primary transition-colors"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Let me in! 🚀"}
          </button>
          <button type="button" onClick={onCancel} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← That's not me
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Step 2: Pick your name ─────────────────────────────────────────────────────
function StudentPickerStep({
  classInfo,
  students,
  onBack,
}: {
  classInfo: { class_name: string; class_code: string };
  students: { id: string; first_name: string; avatar: string }[];
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<typeof students[number] | null>(null);
  const { setStudent } = useStudentAuth();
  const [, navigate] = useLocation();

  function handleSuccess(session: StudentSession) {
    setStudent(session);
    navigate("/classroom");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h2 className="font-serif font-bold text-xl text-foreground">{classInfo.class_name}</h2>
          <p className="text-muted-foreground text-sm">Tap your name to log in</p>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-5xl mb-3">🏫</p>
          <p className="font-medium">No students in this class yet.</p>
          <p className="text-sm mt-1">Ask your teacher to add you!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {students.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border-2 border-border hover:border-primary hover:bg-primary/5 transition-all active:scale-95"
            >
              <span className="text-4xl leading-none">{s.avatar}</span>
              <span className="text-xs font-bold text-foreground text-center leading-tight break-words w-full">{s.first_name}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <PinModal
          student={selected}
          onCancel={() => setSelected(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudentLogin() {
  const [step, setStep] = useState<"code" | "pick">("code");
  const [classData, setClassData] = useState<{ class: any; students: any[] } | null>(null);
  const [, navigate] = useLocation();

  function handleFound(data: { class: any; students: any[] }) {
    setClassData(data);
    setStep("pick");
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Back to main sign-in */}
        {step === "code" && (
          <button
            onClick={() => navigate("/sign-in")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </button>
        )}

        {step === "code" && <ClassCodeStep onFound={handleFound} />}
        {step === "pick" && classData && (
          <StudentPickerStep
            classInfo={classData.class}
            students={classData.students}
            onBack={() => setStep("code")}
          />
        )}
      </div>
    </div>
  );
}
