import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Gift, Copy, Check, BookOpen, ArrowRight, Loader2 } from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  one_story:     "1 story credit",
  one_month:     "30 days of unlimited stories",
  six_months:    "180 days of unlimited stories",
  twelve_months: "365 days of unlimited stories",
};

export default function GiftCardSuccess() {
  const sessionId = new URLSearchParams(window.location.search).get("session_id");

  const [code, setCode]       = useState<string | null>(null);
  const [tier, setTier]       = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    if (!sessionId) { setError("No session ID found in the URL."); setLoading(false); return; }
    fetch(`/api/gift-cards/session/${sessionId}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error("Not found")))
      .then(data => { setCode(data.code); setTier(data.tier); })
      .catch(() => setError("We couldn't find a gift card for this purchase. Please contact support."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const copyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-accent/5 to-transparent flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-card rounded-3xl border border-border shadow-2xl overflow-hidden">

          {/* Header banner */}
          <div className="bg-primary px-8 py-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-white">Thank you!</h1>
            <p className="text-white/80 mt-2 text-base">Your gift card is ready to share.</p>
          </div>

          <div className="px-8 py-8">
            {loading && (
              <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading your gift card…</span>
              </div>
            )}

            {error && (
              <div className="text-center py-6">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {code && !loading && (
              <div className="space-y-6">
                {tier && (
                  <div className="text-center">
                    <span className="inline-block px-3 py-1 bg-accent/15 text-accent-foreground text-sm font-bold rounded-full">
                      {TIER_LABELS[tier] ?? tier}
                    </span>
                  </div>
                )}

                {/* The code */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2 font-medium">Gift card code</p>
                  <div className="flex items-center gap-3 bg-muted rounded-2xl px-5 py-4 border border-border">
                    <span className="flex-1 text-2xl font-mono font-bold text-foreground tracking-widest text-center">
                      {code}
                    </span>
                    <button
                      onClick={copyCode}
                      className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-all"
                      title="Copy code"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  {copied && <p className="text-xs text-primary font-semibold mt-2">Copied to clipboard!</p>}
                </div>

                {/* Instructions */}
                <div className="bg-accent/10 rounded-2xl p-5 border border-accent/20 space-y-2">
                  <p className="text-sm font-bold text-foreground">How to redeem:</p>
                  <ol className="text-sm text-muted-foreground space-y-1.5 list-none">
                    <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Share this code with the lucky recipient</li>
                    <li className="flex gap-2"><span className="text-primary font-bold">2.</span> They sign in or create a free account at sionlegacyoriginals.com</li>
                    <li className="flex gap-2"><span className="text-primary font-bold">3.</span> They enter the code on the Redeem page to unlock their stories</li>
                  </ol>
                </div>

                <Link href="/gift-card/redeem">
                  <button className="w-full flex items-center justify-center gap-2 py-3 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-sm transition-all">
                    Redeem a code yourself
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/">
            <span className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <BookOpen className="w-4 h-4" />
              Sion Kids Read
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
