/**
 * Admin: School Access Codes
 * Protected by MASTER_TEST_CODE — only the site owner should know this.
 * Teachers enter their school's unique code once to unlock classroom features.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, Plus, ShieldCheck, ShieldOff, Copy, Check, Loader2, GraduationCap, RefreshCw } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function adminFetch(path: string, master: string, opts?: RequestInit) {
  const sep = path.includes("?") ? "&" : "?";
  const r = await fetch(`${BASE}${path}${sep}master=${encodeURIComponent(master)}`, {
    credentials: "include",
    ...opts,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Request failed");
  return d;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeRow({ code, master }: { code: any; master: string }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: (isActive: boolean) =>
      adminFetch(`/api/admin/school-codes/${code.id}`, master, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-school-codes", master] }),
  });

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${code.is_active ? "bg-card border-border/60" : "bg-muted/30 border-border/30 opacity-60"}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono font-bold text-primary tracking-widest text-sm">{code.code}</span>
          <CopyButton text={code.code} />
          {code.is_active
            ? <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Active</span>
            : <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Revoked</span>
          }
        </div>
        <p className="text-sm font-medium text-foreground truncate">{code.school_name}</p>
        <p className="text-xs text-muted-foreground">
          {code.teacher_count} teacher{code.teacher_count !== 1 ? "s" : ""} • Created {new Date(code.created_at).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={() => toggle.mutate(!code.is_active)}
        disabled={toggle.isPending}
        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
          code.is_active
            ? "border border-red-300 text-red-600 hover:bg-red-50"
            : "border border-green-300 text-green-700 hover:bg-green-50"
        }`}
      >
        {toggle.isPending
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : code.is_active
            ? <><ShieldOff className="w-3 h-3" /> Revoke</>
            : <><ShieldCheck className="w-3 h-3" /> Reactivate</>
        }
      </button>
    </div>
  );
}

function AdminPanel({ master }: { master: string }) {
  const qc = useQueryClient();
  const [schoolName, setSchoolName] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [createError, setCreateError] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-school-codes", master],
    queryFn: () => adminFetch("/api/admin/school-codes", master),
  });

  const codes: any[] = data?.codes ?? [];

  const createCode = useMutation({
    mutationFn: () =>
      adminFetch("/api/admin/school-codes", master, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolName, customCode: customCode || undefined }),
      }),
    onSuccess: () => {
      setSchoolName(""); setCustomCode(""); setShowForm(false); setCreateError("");
      qc.invalidateQueries({ queryKey: ["admin-school-codes", master] });
    },
    onError: (e: any) => setCreateError(e.message),
  });

  const activeCodes = codes.filter(c => c.is_active);
  const revokedCodes = codes.filter(c => !c.is_active);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total schools", value: codes.length },
          { label: "Active codes", value: activeCodes.length },
          { label: "Total teachers", value: codes.reduce((s, c) => s + (c.teacher_count ?? 0), 0) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border/60 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="font-bold text-lg text-foreground flex-1">School Access Codes</h2>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setShowForm(v => !v); setCreateError(""); }}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-full hover:bg-primary/90 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> New school
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
          <h3 className="font-bold text-sm text-foreground">Add a new school</h3>
          <input
            type="text"
            placeholder="School name (e.g. Lincoln Elementary)"
            value={schoolName}
            onChange={e => { setSchoolName(e.target.value); setCreateError(""); }}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Custom code (optional — leave blank to auto-generate)"
              value={customCode}
              onChange={e => setCustomCode(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
              maxLength={16}
            />
            <button
              onClick={() => createCode.mutate()}
              disabled={createCode.isPending || !schoolName.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {createCode.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
            </button>
          </div>
          {createError && <p className="text-destructive text-xs">{createError}</p>}
        </div>
      )}

      {/* Code list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-25" />
          <p className="text-sm">No school codes yet — create your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeCodes.map(c => <CodeRow key={c.id} code={c} master={master} />)}
          {revokedCodes.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground pt-2 pb-1 font-medium">Revoked</p>
              {revokedCodes.map(c => <CodeRow key={c.id} code={c} master={master} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminSchoolCodes() {
  const [inputCode, setInputCode] = useState("");
  const [master, setMaster] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function authenticate() {
    if (!inputCode.trim()) return;
    setChecking(true);
    setError("");
    try {
      await adminFetch("/api/admin/school-codes", inputCode.trim());
      setMaster(inputCode.trim());
    } catch {
      setError("Incorrect master code.");
    } finally {
      setChecking(false);
    }
  }

  if (!master) {
    return (
      <div className="max-w-sm mx-auto py-24 flex flex-col items-center gap-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="font-serif font-bold text-2xl text-foreground mb-1">Admin Access</h1>
          <p className="text-muted-foreground text-sm">Enter your master code to manage school access codes.</p>
        </div>
        <div className="w-full space-y-3">
          <input
            type="password"
            placeholder="Master code"
            value={inputCode}
            onChange={e => { setInputCode(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && authenticate()}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoComplete="off"
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          <button
            onClick={authenticate}
            disabled={checking || !inputCode.trim()}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enter"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in space-y-2">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">School Codes Admin</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create and manage per-school teacher access codes.
          </p>
        </div>
      </div>
      <AdminPanel master={master} />
    </div>
  );
}
