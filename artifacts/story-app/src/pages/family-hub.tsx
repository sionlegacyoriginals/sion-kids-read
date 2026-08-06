import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@clerk/react";
import {
  Home, Plus, Trash2, RefreshCw, Lock, Star, Settings, Users,
  BookHeart, ChevronRight, Loader2, CheckCircle, X, Pencil, KeyRound, Share2, Camera, Eye, EyeOff,
  ThumbsUp, ThumbsDown, BookOpen,
} from "lucide-react";
import { AvatarPicker } from "@/components/avatar-picker";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const CHARACTER_VALUES = [
  "Courage", "Kindness", "Honesty", "Friendship", "Patience",
  "Gratitude", "Perseverance", "Generosity", "Humility", "Loyalty",
  "Compassion", "Responsibility", "Creativity", "Curiosity", "Joy",
  "Hope", "Love", "Self-Control", "Trustworthiness", "Teamwork",
  "Respect", "Empathy", "Sharing", "Diligence", "Bravery",
];

// ── Child avatar display ───────────────────────────────────────────────────────
function ChildAvatar({
  avatar, photoUrl, size = "md",
}: { avatar?: string; photoUrl?: string | null; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "w-10 h-10" : size === "lg" ? "w-16 h-16" : "w-12 h-12";
  const emoji = size === "sm" ? "text-2xl" : size === "lg" ? "text-5xl" : "text-4xl";
  const src = photoUrl ?? (avatar?.startsWith("/ref-photos/") ? avatar : null);
  if (src) return <img src={`/api${src}`} alt="avatar" className={`${dims} rounded-full object-cover border-2 border-primary/20 shrink-0`} />;
  return <span className={`${emoji} leading-none shrink-0`}>{avatar ?? "🧒"}</span>;
}

function UpsellCard({ onAccessGranted }: { onAccessGranted: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      const r = await fetch(`${basePath}/api/access-code/redeem`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Failed to redeem code."); return; }
      setSuccess("Access granted! Setting up your Homeschool Hub…");
      setTimeout(onAccessGranted, 1200);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-16 px-6 space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-foreground">Unlock Homeschool Hub</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Add child profiles, set weekly sight words and character values, track reading points, and enjoy the full classroom experience at home.
        </p>
      </div>

      {/* Access code box */}
      <div className="border border-border rounded-2xl p-5 space-y-3 bg-card">
        <div className="flex items-center gap-2 font-bold text-foreground text-sm">
          <KeyRound className="w-4 h-4 text-primary" />
          Have an access code or gift card?
        </div>
        {success ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4 shrink-0" /> {success}
          </div>
        ) : (
          <form onSubmit={handleRedeem} className="flex gap-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Enter your code"
              className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 uppercase placeholder:normal-case"
            />
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 text-sm whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem"}
            </button>
          </form>
        )}
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex-1 border-t border-border" />
        or
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Subscribe CTA */}
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">Start a subscription to get Homeschool Hub plus unlimited stories.</p>
        <Link href="/subscribe">
          <a className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-sm">
            <Star className="w-5 h-5" /> View subscription plans
          </a>
        </Link>
      </div>
    </div>
  );
}

function CreateHubForm({ onCreated }: { onCreated: (hub: any) => void }) {
  const [name, setName] = useState("Our Homeschool Hub");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const r = await fetch(`${basePath}/api/family-hub`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hubName: name.trim() }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Failed to create hub."); return; }
      onCreated(data.hub);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto py-16 px-6 space-y-8">
      <div className="text-center space-y-3">
        <div className="text-6xl">🏠</div>
        <h2 className="text-2xl font-serif font-bold text-foreground">Create your Homeschool Hub</h2>
        <p className="text-muted-foreground text-sm">Give your hub a name, then add your children to get started.</p>
      </div>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">Hub name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={60}
            className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-background text-foreground focus:outline-none focus:border-primary transition-colors text-lg font-semibold"
            placeholder="Our Homeschool Hub"
            autoFocus
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl text-base hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          {loading ? "Creating…" : "Create Homeschool Hub"}
        </button>
      </form>
    </div>
  );
}

// ── Add child form ─────────────────────────────────────────────────────────────
function AddChildForm({ onAdded, onCancel }: { onAdded: (child: any) => void; onCancel: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [avatar, setAvatar] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`${basePath}/api/family-hub/children`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), avatar: avatar || undefined }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Failed to add child."); return; }
      onAdded(data.child);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-xl text-foreground">Add a child</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">First name</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              maxLength={40}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-background text-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. Emma"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              Choose an illustrated avatar
              <span className="font-normal text-muted-foreground ml-1">(you can add a real photo after saving)</span>
            </label>
            <AvatarPicker
              selected={avatar ? [avatar] : []}
              onChange={paths => setAvatar(paths[0] ?? "")}
              maxSelect={1}
              basePath={basePath}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !firstName.trim()}
            className="w-full py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? "Adding…" : "Add child"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── PIN display modal ─────────────────────────────────────────────────────────
function PinDisplay({ child, pin, onClose }: { child: any; pin: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-card border border-border rounded-3xl p-8 w-full max-w-xs shadow-2xl text-center space-y-4">
        <div className="flex justify-center">
          <ChildAvatar avatar={child.avatar} photoUrl={child.photo_url} className="w-16 h-16 text-5xl flex items-center justify-center" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-xl text-foreground">{child.first_name}'s new PIN</h3>
          <p className="text-muted-foreground text-sm mt-1">Write this down — it won't be shown again.</p>
        </div>
        <div className="bg-primary/10 border-2 border-primary/30 rounded-2xl py-5 px-8">
          <p className="text-5xl font-mono font-bold text-primary tracking-[0.4em]">{pin}</p>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all"
        >
          <CheckCircle className="inline w-4 h-4 mr-1.5" /> Got it!
        </button>
      </div>
    </div>
  );
}

// ── Settings panel ────────────────────────────────────────────────────────────
function SettingsPanel({ hub, onSaved }: { hub: any; onSaved: (updated: Partial<any>) => void }) {
  const [hubName, setHubName] = useState(hub.class_name ?? "");
  const [message, setMessage] = useState(hub.announcement_message ?? "");
  const [valueOfWeek, setValueOfWeek] = useState(hub.value_of_week ?? "");
  const [sightWords, setSightWords] = useState(hub.sight_words ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setSaved(false);
    try {
      const r = await fetch(`${basePath}/api/family-hub/settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hubName, message, valueOfWeek, sightWords }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Failed to save settings."); return; }
      setSaved(true);
      onSaved({ class_name: hubName, announcement_message: message, value_of_week: valueOfWeek, sight_words: sightWords });
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div>
        <label className="block text-sm font-bold text-foreground mb-1.5">Hub name</label>
        <input
          type="text"
          value={hubName}
          onChange={e => setHubName(e.target.value)}
          maxLength={60}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-foreground mb-1.5">Weekly message <span className="font-normal text-muted-foreground">(optional)</span></label>
        <textarea
          rows={2}
          value={message}
          onChange={e => setMessage(e.target.value)}
          maxLength={300}
          placeholder="A note for your kids this week…"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-foreground mb-1.5">Character value of the week</label>
        <select
          value={valueOfWeek}
          onChange={e => setValueOfWeek(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">— None selected —</option>
          {CHARACTER_VALUES.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-foreground mb-1">
          Weekly sight words <span className="font-normal text-muted-foreground">(comma-separated)</span>
        </label>
        <p className="text-xs text-muted-foreground mb-2">e.g. the, and, is, for, you, said</p>
        <textarea
          rows={2}
          value={sightWords}
          onChange={e => setSightWords(e.target.value)}
          placeholder="the, and, is, for, you, said"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-sm"
        />
        {sightWords && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {sightWords.split(",").map(w => w.trim()).filter(Boolean).map(w => (
              <span key={w} className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg">{w}</span>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
        {loading ? "Saving…" : saved ? "Saved!" : "Save settings"}
      </button>
    </form>
  );
}

// ── Hub dashboard ─────────────────────────────────────────────────────────────
function HubDashboard({ hub: initialHub }: { hub: any }) {
  const [hub, setHub] = useState(initialHub);
  const [children, setChildren] = useState<any[]>(initialHub.children ?? []);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pinDisplay, setPinDisplay] = useState<{ child: any; pin: string } | null>(null);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [photoUploadLoading, setPhotoUploadLoading] = useState<string | null>(null);
  const [pinVisible, setPinVisible] = useState<Record<string, boolean>>({});
  const [pendingStories, setPendingStories] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [approveLoading, setApproveLoading] = useState<number | null>(null);
  const [rejectLoading, setRejectLoading] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoUploadTargetRef = useRef<string | null>(null);

  function handlePhotoButtonClick(childId: string) {
    photoUploadTargetRef.current = childId;
    photoInputRef.current?.click();
  }

  async function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const childId = photoUploadTargetRef.current;
    if (!childId) return;
    setPhotoUploadLoading(childId);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const r = await fetch(`${basePath}/api/family-hub/children/${childId}/photo`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const result = await r.json();
      if (r.ok) {
        setChildren(prev => prev.map(c => c.id === childId ? { ...c, photo_url: result.photoUrl } : c));
      }
    } catch {
      // silent — user can try again
    } finally {
      setPhotoUploadLoading(null);
    }
  }

  function handleShareLink() {
    const code = hub.class_code as string | undefined;
    if (!code) return;
    const url = `${window.location.origin}${basePath}/family-hub/login?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }).catch(() => {
      // Fallback: show the URL in a prompt if clipboard API unavailable
      window.prompt("Copy this link for your children:", url);
    });
  }

  // Load pending stories on mount
  useEffect(() => {
    fetch(`${basePath}/api/classroom/pending-stories`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setPendingStories(d.stories ?? []))
      .catch(() => {})
      .finally(() => setPendingLoading(false));
  }, []);

  async function handleApprove(storyId: number) {
    setApproveLoading(storyId);
    try {
      const r = await fetch(`${basePath}/api/classroom/pending-stories/${storyId}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (r.ok) setPendingStories(prev => prev.filter(s => s.id !== storyId));
    } finally { setApproveLoading(null); }
  }

  async function handleReject(storyId: number) {
    if (!confirm("Remove this story? The child can write a new one.")) return;
    setRejectLoading(storyId);
    try {
      const r = await fetch(`${basePath}/api/classroom/pending-stories/${storyId}/reject`, {
        method: "POST",
        credentials: "include",
      });
      if (r.ok) setPendingStories(prev => prev.filter(s => s.id !== storyId));
    } finally { setRejectLoading(null); }
  }

  function handleChildAdded(child: any) {
    setChildren(prev => [...prev, child]);
    setShowAddChild(false);
    // Show the initial PIN immediately
    setPinDisplay({ child, pin: child.pin });
  }

  async function handleResetPin(child: any) {
    setResetLoading(child.id);
    try {
      const r = await fetch(`${basePath}/api/family-hub/children/${child.id}/pin`, {
        method: "PUT",
        credentials: "include",
      });
      const data = await r.json();
      if (r.ok) setPinDisplay({ child, pin: data.pin });
    } finally { setResetLoading(null); }
  }

  async function handleRemove(childId: string) {
    if (!confirm("Remove this child from your Homeschool Hub? Their reading progress will be lost.")) return;
    setRemoveLoading(childId);
    try {
      const r = await fetch(`${basePath}/api/family-hub/children/${childId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (r.ok) setChildren(prev => prev.filter(c => c.id !== childId));
    } finally { setRemoveLoading(null); }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
            <Home className="w-3.5 h-3.5" /> Homeschool Hub
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">{hub.class_name}</h1>
          {hub.class_code && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Family code:</span>
              <span className="font-mono font-bold text-sm text-primary tracking-widest bg-primary/10 px-2 py-0.5 rounded-lg">{hub.class_code}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end shrink-0">
          {hub.class_code && (
            <button
              onClick={handleShareLink}
              title="Copy child login link"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-primary hover:border-primary transition-all"
            >
              {linkCopied
                ? <><CheckCircle className="w-4 h-4 text-green-600" /> Copied!</>
                : <><Share2 className="w-4 h-4" /> Share Link</>}
            </button>
          )}
          <button
            onClick={() => navigate("/family-hub/login")}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all text-sm shadow-sm"
          >
            Log in as child <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekly summary strip */}
      {(hub.value_of_week || hub.sight_words) && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-wrap gap-4 items-start">
          {hub.value_of_week && (
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">💛 Value this week</p>
              <p className="font-bold text-foreground text-sm">{hub.value_of_week}</p>
            </div>
          )}
          {hub.sight_words && (
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">🔤 Sight words</p>
              <div className="flex flex-wrap gap-1">
                {hub.sight_words.split(",").map((w: string) => w.trim()).filter(Boolean).map((w: string) => (
                  <span key={w} className="px-2 py-0.5 bg-primary text-white text-xs font-bold rounded-lg">{w}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Stories — parent approval queue */}
      {(pendingLoading || pendingStories.length > 0) && (
        <div>
          <h2 className="font-serif font-bold text-xl text-foreground flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" /> Stories to Review
            {pendingStories.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-primary text-white text-xs font-bold rounded-full">{pendingStories.length}</span>
            )}
          </h2>

          {pendingLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4">
              {pendingStories.map(story => (
                <div key={story.id} className="border-2 border-amber-200 bg-amber-50 rounded-2xl p-4 space-y-3">
                  {/* Story header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-foreground">{story.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by {story.student_name} · {new Date(story.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {/* Story preview */}
                  <p className="text-sm text-foreground leading-relaxed line-clamp-4 whitespace-pre-line">
                    {story.content}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(story.id)}
                      disabled={approveLoading === story.id || rejectLoading === story.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all text-sm disabled:opacity-50"
                    >
                      {approveLoading === story.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <ThumbsUp className="w-4 h-4" />}
                      Approve & publish
                    </button>
                    <button
                      onClick={() => handleReject(story.id)}
                      disabled={approveLoading === story.id || rejectLoading === story.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-card border border-border text-muted-foreground font-semibold rounded-xl hover:border-destructive hover:text-destructive transition-all text-sm disabled:opacity-50"
                    >
                      {rejectLoading === story.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <ThumbsDown className="w-4 h-4" />}
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Children */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-bold text-xl text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Children
          </h2>
          {children.length < 6 && (
            <button
              onClick={() => setShowAddChild(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-all text-sm border border-primary/20"
            >
              <Plus className="w-4 h-4" /> Add child
            </button>
          )}
        </div>

        {children.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
            <p className="text-4xl mb-3">👧👦</p>
            <p className="font-medium">No children added yet</p>
            <p className="text-sm mt-1">Tap "Add child" to create your first profile.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {children.map(child => (
              <div
                key={child.id}
                className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl"
              >
                {/* Avatar */}
                <ChildAvatar avatar={child.avatar} photoUrl={child.photo_url} size="md" />

                {/* Name + stats + actions */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: name + action icons */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-foreground truncate">{child.first_name}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handlePhotoButtonClick(child.id)}
                        disabled={photoUploadLoading === child.id}
                        title={child.photo_url ? "Replace photo" : "Upload photo"}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-muted-foreground border border-border hover:border-primary hover:text-primary transition-all disabled:opacity-50"
                      >
                        {photoUploadLoading === child.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Camera className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{child.photo_url ? "Photo" : "Photo"}</span>
                      </button>
                      <button
                        onClick={() => handleResetPin(child)}
                        disabled={resetLoading === child.id}
                        title="Reset PIN"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-muted-foreground border border-border hover:border-primary hover:text-primary transition-all disabled:opacity-50"
                      >
                        {resetLoading === child.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <RefreshCw className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">Reset PIN</span>
                      </button>
                      <button
                        onClick={() => handleRemove(child.id)}
                        disabled={removeLoading === child.id}
                        title="Remove child"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                      >
                        {removeLoading === child.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Row 2: points + PIN reveal */}
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-sm text-yellow-600 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                      {child.points ?? 0} pts
                    </div>
                    <button
                      onClick={() => setPinVisible(v => ({ ...v, [child.id]: !v[child.id] }))}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      title={pinVisible[child.id] ? "Hide PIN" : "Show PIN"}
                    >
                      {pinVisible[child.id]
                        ? <><EyeOff className="w-3.5 h-3.5" /><span className="font-mono font-bold tracking-widest text-foreground ml-0.5">{child.pin}</span></>
                        : <><Eye className="w-3.5 h-3.5" /><span className="ml-0.5">PIN</span></>}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="border-t border-border/60 pt-6">
        <button
          onClick={() => setShowSettings(v => !v)}
          className="flex items-center gap-2 font-bold text-foreground mb-4 hover:text-primary transition-colors"
        >
          <Settings className="w-5 h-5 text-primary" />
          Weekly Settings
          <span className="text-xs font-normal text-muted-foreground ml-1">{showSettings ? "▲ hide" : "▼ show"}</span>
        </button>
        {showSettings && (
          <SettingsPanel
            hub={hub}
            onSaved={updates => setHub((h: any) => ({ ...h, ...updates }))}
          />
        )}
      </div>

      {/* Hidden file input for child photo uploads */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoFileChange}
      />

      {/* Modals */}
      {showAddChild && (
        <AddChildForm onAdded={handleChildAdded} onCancel={() => setShowAddChild(false)} />
      )}
      {pinDisplay && (
        <PinDisplay child={pinDisplay.child} pin={pinDisplay.pin} onClose={() => setPinDisplay(null)} />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FamilyHub() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<{
    hasAccess: boolean;
    hub: any | null;
  } | null>(null);

  function loadHub() {
    setLoading(true);
    fetch(`${basePath}/api/family-hub`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setState(data))
      .catch(() => setState({ hasAccess: false, hub: null }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { navigate("/sign-in"); return; }
    loadHub();
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!state?.hasAccess) return <UpsellCard onAccessGranted={loadHub} />;

  if (!state.hub) {
    return <CreateHubForm onCreated={hub => setState({ hasAccess: true, hub })} />;
  }

  return <HubDashboard hub={state.hub} />;
}
