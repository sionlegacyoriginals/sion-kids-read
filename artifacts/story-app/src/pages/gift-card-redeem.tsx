import { useState } from "react";
import { Link } from "wouter";
import { Gift, Check, Loader2, AlertCircle, ArrowLeft } from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  one_story:     "1 story credit",
  one_month:     "30 days of unlimited stories",
  six_months:    "180 days of unlimited stories",
  twelve_months: "365 days of unlimited stories",
};

export default function GiftCardRedeem() {
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [reward, setReward]   = useState<string | null>(null);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gift-cards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setReward(TIER_LABELS[data.tier] ?? data.reward);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-16 px-4">

      <Link href="/create">
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>
      </Link>

      <div className="bg-card rounded-3xl border border-border shadow-md overflow-hidden">

        {/* Header */}
        <div className="bg-primary/10 border-b border-border/50 px-8 py-7 text-center">
          <div className="w-14 h-14 bg-primary/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Gift className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Redeem a gift card</h1>
          <p className="text-muted-foreground text-sm mt-1">Enter your code below to unlock stories</p>
        </div>

        <div className="px-8 py-8">
          {reward ? (
            /* ── Success state ── */
            <div className="text-center space-y-5">
              <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-serif font-bold text-foreground">Gift redeemed!</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Your account has been credited with <span className="font-semibold text-foreground">{reward}</span>.
                </p>
              </div>
              <Link href="/create">
                <button className="w-full py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all">
                  Create your first story →
                </button>
              </Link>
            </div>
          ) : (
            /* ── Input form ── */
            <form onSubmit={handleRedeem} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Gift card code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
                  placeholder="SLO-XXXXXXXX"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background font-mono text-lg tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!code.trim() || loading}
                className="w-full py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Redeeming…</>
                ) : (
                  "Redeem gift card"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
