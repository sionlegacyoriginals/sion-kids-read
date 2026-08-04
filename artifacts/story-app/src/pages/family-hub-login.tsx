import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@clerk/react";
import { Loader2, ArrowLeft, Home } from "lucide-react";
import { useStudentAuth, type StudentSession } from "@/lib/studentAuth";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── PIN modal ─────────────────────────────────────────────────────────────────
function PinModal({
  child,
  onCancel,
  onSuccess,
}: {
  child: { id: string; first_name: string; avatar: string };
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
        body: JSON.stringify({ studentId: child.id, pin }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Wrong PIN. Try again.");
        setPin("");
        inputRef.current?.focus();
        return;
      }
      onSuccess({
        token: data.token,
        id: data.student.id,
        firstName: data.student.firstName,
        avatar: data.student.avatar,
        classId: data.student.classId,
        className: data.student.className,
        teacherId: data.student.teacherId,
        isFamilyHub: true,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-card border border-border rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center space-y-5">
        <div className="text-6xl">{child.avatar}</div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Hi, {child.first_name}!</h2>
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
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← That's not me
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
// Supports two modes:
//   1. Authenticated (parent device): fetches roster via GET /api/family-hub
//   2. Public (child's own device): requires ?code=FAM_XXXXXXXX in the URL,
//      fetches the public GET /api/family-hub/roster/:classCode endpoint — no
//      Clerk session needed.
export default function FamilyHubLogin() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const { setStudent } = useStudentAuth();

  // ?code= param for child-device (public) mode
  const classCode = new URLSearchParams(search).get("code") ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hubName, setHubName] = useState("");
  const [children, setChildren] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      // Parent device: fetch full hub via authenticated endpoint
      fetch(`${basePath}/api/family-hub`, { credentials: "include" })
        .then(r => r.json())
        .then(data => {
          if (!data.hasAccess || !data.hub) {
            navigate("/family-hub");
            return;
          }
          setHubName(data.hub.class_name ?? "Family Hub");
          setChildren(data.hub.children ?? []);
        })
        .catch(() => setError("Could not load Family Hub. Please try again."))
        .finally(() => setLoading(false));
      return;
    }

    // Child device (not signed in): must have ?code= in URL
    if (!classCode) {
      setError("No hub code found. Ask a parent to share the login link.");
      setLoading(false);
      return;
    }

    fetch(`${basePath}/api/family-hub/roster/${encodeURIComponent(classCode)}`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) { setError(data.error ?? "Hub not found."); return; }
        setHubName(data.hubName ?? "Family Hub");
        setChildren(data.children ?? []);
      })
      .catch(() => setError("Could not load Family Hub. Please try again."))
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, classCode]);

  function handleSuccess(session: StudentSession) {
    setStudent(session);
    navigate("/family-hub/home");
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Back link — only shown on parent-authenticated device */}
        {isSignedIn && (
          <button
            onClick={() => navigate("/family-hub")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Family Hub
          </button>
        )}

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Home className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">{hubName || "Family Hub"}</h1>
          <p className="text-muted-foreground">Tap your name to log in</p>
        </div>

        {error && (
          <p className="text-destructive text-sm text-center">{error}</p>
        )}

        {!error && children.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-5xl mb-3">👧👦</p>
            <p className="font-medium">No children added yet.</p>
            <p className="text-sm mt-1">Ask a parent to add you in the Family Hub.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelected(child)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border-2 border-border hover:border-primary hover:bg-primary/5 transition-all active:scale-95"
              >
                <span className="text-4xl leading-none">{child.avatar}</span>
                <span className="text-xs font-bold text-foreground text-center leading-tight break-words w-full">
                  {child.first_name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <PinModal
          child={selected}
          onCancel={() => setSelected(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
