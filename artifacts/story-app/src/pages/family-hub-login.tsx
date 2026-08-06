import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@clerk/react";
import { Loader2, ArrowLeft, Home } from "lucide-react";
import { useStudentAuth, type StudentSession } from "@/lib/studentAuth";

// ── Step 0: Enter family code (child's own device, no URL code) ───────────────
function FamilyCodeStep({ onFound }: {
  onFound: (hubName: string, children: any[]) => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError("Please enter your family code."); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`${basePath}/api/family-hub/roster/${encodeURIComponent(trimmed)}`);
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Homeschool Hub not found. Check your code and try again."); return; }
      onFound(data.hubName ?? "Homeschool Hub", data.children ?? []);
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
          <Home className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Homeschool Hub Login</h1>
        <p className="text-muted-foreground">Ask a parent for your Homeschool Hub code</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          autoFocus
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
          placeholder="e.g. FAM_ABC12345"
          className="w-full px-5 py-4 text-center text-2xl font-mono font-bold tracking-wider rounded-2xl border-2 border-border bg-background text-foreground focus:outline-none focus:border-primary transition-colors uppercase"
        />
        {error && <p className="text-destructive text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.length < 3}
          className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl text-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Find My Homeschool Hub →"}
        </button>
      </form>
    </div>
  );
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Render a child's avatar (photo, ref-photo, or emoji) ──────────────────────
function ChildAvatar({ avatar, photoUrl, className = "" }: { avatar?: string; photoUrl?: string | null; className?: string }) {
  const src = photoUrl ?? (avatar?.startsWith("/ref-photos/") ? avatar : null);
  if (src) return <img src={`/api${src}`} alt="avatar" className={`rounded-full object-cover ${className}`} />;
  return <span className={className}>{avatar ?? "🧒"}</span>;
}

// ── PIN modal ─────────────────────────────────────────────────────────────────
function PinModal({
  child,
  onCancel,
  onSuccess,
}: {
  child: { id: string; first_name: string; avatar: string; photo_url?: string | null };
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
        photoUrl: data.student.photoUrl ?? undefined,
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
        <div className="flex justify-center">
          <ChildAvatar avatar={child.avatar} photoUrl={child.photo_url} className="w-20 h-20 text-6xl flex items-center justify-center" />
        </div>
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
        .catch(() => setError("Could not load Homeschool Hub. Please try again."))
        .finally(() => setLoading(false));
      return;
    }

    // Child device (not signed in): if no ?code= in URL, show the code-entry form
    if (!classCode) {
      setLoading(false);
      return; // renders FamilyCodeStep below
    }

    fetch(`${basePath}/api/family-hub/roster/${encodeURIComponent(classCode)}`)

      .then(async r => {
        const data = await r.json();
        if (!r.ok) { setError(data.error ?? "Hub not found."); return; }
        setHubName(data.hubName ?? "Homeschool Hub");
        setChildren(data.children ?? []);
      })
      .catch(() => setError("Could not load Homeschool Hub. Please try again."))
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

  // Not signed in and no code in URL — show code-entry form
  if (!isSignedIn && !classCode && children.length === 0 && !error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <FamilyCodeStep
            onFound={(name, kids) => {
              setHubName(name);
              setChildren(kids);
            }}
          />
        </div>
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
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Homeschool Hub
          </button>
        )}

        {/* Back to code entry — child's own device, not signed in */}
        {!isSignedIn && children.length > 0 && (
          <button
            onClick={() => { setChildren([]); setHubName(""); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Different family code
          </button>
        )}

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Home className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">{hubName || "Homeschool Hub"}</h1>
          <p className="text-muted-foreground">Tap your name to log in</p>
        </div>

        {error && (
          <p className="text-destructive text-sm text-center">{error}</p>
        )}

        {!error && children.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-5xl mb-3">👧👦</p>
            <p className="font-medium">No children added yet.</p>
            <p className="text-sm mt-1">Ask a parent to add you in the Homeschool Hub.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelected(child)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border-2 border-border hover:border-primary hover:bg-primary/5 transition-all active:scale-95"
              >
                <ChildAvatar avatar={child.avatar} photoUrl={child.photo_url} className="w-14 h-14 text-4xl flex items-center justify-center" />
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
