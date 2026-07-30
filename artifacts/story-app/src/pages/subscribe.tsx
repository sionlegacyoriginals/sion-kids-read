import { useState } from "react";
import { useUser } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Star, BookHeart, Printer, CheckCircle2, Loader2,
} from "lucide-react";
import { Logo } from "@/components/logo";

async function fetchUserMe() {
  const resp = await fetch("/api/users/me", { credentials: "include" });
  if (!resp.ok) throw new Error("Failed to fetch user");
  return resp.json();
}

export default function Subscribe() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [checkoutLoading, setCheckoutLoading] = useState<"subscription" | "story" | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState(false);

  const { data: me } = useQuery({ queryKey: ["users-me"], queryFn: fetchUserMe });

  const handleCheckout = async (type: "subscription" | "story") => {
    setCheckoutLoading(type);
    setCheckoutError(null);
    try {
      const endpoint = type === "subscription" ? "/api/checkout/subscription" : "/api/checkout/story";
      const resp = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.primaryEmailAddress?.emailAddress }),
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
      // Refresh user info then redirect to create
      await queryClient.invalidateQueries({ queryKey: ["users-me"] });
      setTimeout(() => setLocation("/create"), 1200);
    } catch (err: any) {
      setCodeError(err.message);
    } finally {
      setCodeLoading(false);
    }
  };

  // Already unlocked (subscription or access code)
  if (me?.hasSubscription || me?.hasAccessCode) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
          You're all set!
        </h1>
        <p className="text-muted-foreground mb-8">
          {me?.hasAccessCode
            ? "Your access code is active — enjoy unlimited stories."
            : "Your StoryBloom membership is active."}
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
    <div className="max-w-xl mx-auto py-16 px-4 animate-in fade-in">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary font-bold text-sm rounded-full mb-5">
          <Logo size={16} /> Unlock StoryBloom
        </span>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-3">
          Choose your plan
        </h1>
        <p className="text-muted-foreground">
          Pay per story, or subscribe for unlimited access.
        </p>
      </div>

      {checkoutError && (
        <p className="text-red-600 text-sm text-center mb-4 bg-red-50 border border-red-200 rounded-xl py-2 px-4">{checkoutError}</p>
      )}

      {/* Pricing cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

        {/* Pay per story */}
        <div className="bg-card border border-border/60 rounded-3xl p-8 shadow-sm flex flex-col">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-5xl font-serif font-bold text-foreground">$1.11</span>
            <span className="text-muted-foreground">/story</span>
          </div>
          <p className="text-center text-muted-foreground text-sm mb-6">Pay only when you create</p>

          <ul className="space-y-2.5 mb-8 flex-1">
            {[
              { icon: BookHeart, text: "One personalized story" },
              { icon: null, text: "AI illustrations from your photos" },
              { icon: Star, text: "Bible verse weaving" },
              { icon: Printer, text: "Print & ship for $33.33/book" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-foreground text-sm">
                {Icon ? <Icon className="w-4 h-4 text-primary flex-shrink-0" /> : <Logo size={16} />}
                {text}
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleCheckout("story")}
            disabled={checkoutLoading !== null}
            className="w-full py-3 bg-muted text-foreground font-bold rounded-full hover:bg-muted/70 border border-border transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {checkoutLoading === "story" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
            ) : (
              "Buy one story — $1.11"
            )}
          </button>
        </div>

        {/* Monthly subscription */}
        <div className="bg-card border-2 border-primary rounded-3xl p-8 shadow-md flex flex-col relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-xs font-bold rounded-full">
            Best value
          </span>
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-5xl font-serif font-bold text-foreground">$3.33</span>
            <span className="text-muted-foreground">/month</span>
          </div>
          <p className="text-center text-muted-foreground text-sm mb-6">Cancel anytime</p>

          <ul className="space-y-2.5 mb-8 flex-1">
            {[
              { icon: BookHeart, text: "Unlimited personalized stories" },
              { icon: null, text: "AI illustrations from your photos" },
              { icon: Star, text: "Bible verse weaving" },
              { icon: Printer, text: "Print & ship for $33.33/book" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-foreground text-sm">
                {Icon ? <Icon className="w-4 h-4 text-primary flex-shrink-0" /> : <Logo size={16} />}
                {text}
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleCheckout("subscription")}
            disabled={checkoutLoading !== null}
            className="w-full py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {checkoutLoading === "subscription" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
            ) : (
              "Subscribe — $3.33/mo"
            )}
          </button>
        </div>
      </div>

      {/* Access code collapsible */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <button
          onClick={() => setCodeOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-6 py-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Have an access code?
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${codeOpen ? "rotate-180" : ""}`}
          />
        </button>

        {codeOpen && (
          <form
            onSubmit={handleRedeemCode}
            className="px-6 pb-6 space-y-3 animate-in slide-in-from-top-2"
          >
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
                {codeLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : codeSuccess ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  "Apply"
                )}
              </button>
            </div>

            {codeSuccess && (
              <p className="text-green-600 text-sm font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Code accepted — redirecting…
              </p>
            )}
            {codeError && (
              <p className="text-red-600 text-sm">{codeError}</p>
            )}
          </form>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already subscribed?{" "}
        <Link href="/account" className="text-primary font-bold hover:underline">
          Manage your account
        </Link>
      </p>
    </div>
  );
}
