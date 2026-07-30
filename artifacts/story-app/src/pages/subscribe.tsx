import { useState } from "react";
import { useUser } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Star, BookHeart, Printer, CheckCircle2, Loader2, KeyRound, ChevronDown, Sparkles,
} from "lucide-react";
import { Logo } from "@/components/logo";

async function fetchUserMe() {
  const resp = await fetch("/api/users/me", { credentials: "include" });
  if (!resp.ok) throw new Error("Failed to fetch user");
  return resp.json();
}

type Period = "story" | "monthly" | "6months" | "yearly";

const PLANS: { period: Period; label: string; price: string; sub: string; badge?: string; featured?: boolean }[] = [
  { period: "story",   label: "One story",  price: "$1.11",  sub: "Pay once, no subscription" },
  { period: "monthly", label: "Monthly",    price: "$8.88",  sub: "per month · cancel anytime" },
  { period: "6months", label: "6 months",   price: "$44.44", sub: "one payment · 6 months of stories" },
  { period: "yearly",  label: "1 year",     price: "$77.77", sub: "one payment · a full year of stories", badge: "Best value", featured: true },
];

const FEATURES = [
  { icon: BookHeart, text: "Unlimited personalized stories" },
  { icon: null,      text: "AI illustrations from your photos" },
  { icon: Star,      text: "Bible verse weaving" },
  { icon: Printer,   text: "Print & ship for $33.33/book" },
];

export default function Subscribe() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [checkoutLoading, setCheckoutLoading] = useState<Period | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState(false);

  const { data: me } = useQuery({ queryKey: ["users-me"], queryFn: fetchUserMe });

  const handleCheckout = async (period: Period) => {
    setCheckoutLoading(period);
    setCheckoutError(null);
    try {
      const endpoint = period === "story" ? "/api/checkout/story" : "/api/checkout/subscription";
      const resp = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.primaryEmailAddress?.emailAddress,
          ...(period !== "story" ? { period } : {}),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err: any) {
      setCheckoutError(err.message);
      setCheckoutLoading(null);
    }
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeLoading(true);
    setCodeError(null);
    setCodeSuccess(false);
    try {
      const resp = await fetch("/api/access-code/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Invalid code");
      setCodeSuccess(true);
      await queryClient.invalidateQueries({ queryKey: ["users-me"] });
      setTimeout(() => setLocation("/create"), 1200);
    } catch (err: any) {
      setCodeError(err.message);
    } finally {
      setCodeLoading(false);
    }
  };

  if (me?.hasSubscription || me?.hasAccessCode) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">You're all set!</h1>
        <p className="text-muted-foreground mb-8">
          {me?.hasAccessCode
            ? "Your access code is active — enjoy unlimited stories."
            : "Your membership is active."}
        </p>
        <Link href="/create">
          <button className="px-8 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90">
            Create a story →
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 animate-in fade-in">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary font-bold text-sm rounded-full mb-5">
          <Logo size={16} /> Unlock StoryBloom
        </span>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Choose your plan</h1>
        <p className="text-muted-foreground">Pay per story, or subscribe for unlimited access.</p>
      </div>

      {checkoutError && (
        <p className="text-red-600 text-sm text-center mb-6 bg-red-50 border border-red-200 rounded-xl py-2 px-4">
          {checkoutError}
        </p>
      )}

      {/* What's included */}
      <div className="bg-muted/40 rounded-2xl px-6 py-4 mb-6 flex flex-wrap gap-x-6 gap-y-2">
        {FEATURES.map(({ icon: Icon, text }) => (
          <span key={text} className="flex items-center gap-2 text-sm text-foreground">
            {Icon ? <Icon className="w-4 h-4 text-primary shrink-0" /> : <Logo size={14} />}
            {text}
          </span>
        ))}
      </div>

      {/* Plan options */}
      <div className="space-y-3 mb-6">
        {PLANS.map(({ period, label, price, sub, badge, featured }) => (
          <button
            key={period}
            onClick={() => handleCheckout(period)}
            disabled={checkoutLoading !== null}
            className={`w-full flex items-center gap-5 p-5 rounded-2xl border-2 text-left transition-all disabled:opacity-60 ${
              featured
                ? "border-primary bg-primary/5 hover:bg-primary/10"
                : "border-border hover:border-primary/40 hover:bg-muted/40"
            }`}
          >
            <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${featured ? "bg-primary/20" : "bg-primary/10"}`}>
              {period === "story"
                ? <BookHeart className="w-5 h-5 text-primary" />
                : <Sparkles className="w-5 h-5 text-primary" />}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground">{label}</span>
                {badge && (
                  <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold">
                    {badge}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">{sub}</div>
            </div>

            <div className="shrink-0 text-right">
              {checkoutLoading === period ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <span className="text-2xl font-serif font-bold text-foreground">{price}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Access / gift card code */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm mb-6">
        <button
          onClick={() => setCodeOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-6 py-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Have a gift card or access code?
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${codeOpen ? "rotate-180" : ""}`} />
        </button>

        {codeOpen && (
          <form onSubmit={handleRedeemCode} className="px-6 pb-6 space-y-3 animate-in slide-in-from-top-2">
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter your code"
                disabled={codeLoading || codeSuccess}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!code.trim() || codeLoading || codeSuccess}
                className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {codeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : codeSuccess ? <CheckCircle2 className="w-4 h-4" /> : "Apply"}
              </button>
            </div>
            {codeSuccess && (
              <p className="text-green-600 text-sm font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Code accepted — redirecting…
              </p>
            )}
            {codeError && <p className="text-red-600 text-sm">{codeError}</p>}
          </form>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already subscribed?{" "}
        <Link href="/account" className="text-primary font-bold hover:underline">Manage your account</Link>
      </p>
    </div>
  );
}
