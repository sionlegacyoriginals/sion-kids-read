import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { CheckCircle2, BookHeart, Printer, MapPin, Clock, Package } from "lucide-react";

interface PrintOrder {
  id: number;
  status: string;
  customer_name: string;
  customer_email: string;
  shipping_address: any;
  amount_cents: number;
  created_at: string;
  story_title: string;
  cover_image_url: string | null;
  lulu_job_id: string | null;
  lulu_last_error: string | null;
}

function formatAddress(addr: any): string {
  if (!addr) return "";
  const parts = [
    addr.street1,
    addr.street2,
    `${addr.city}, ${addr.state_code} ${addr.postcode}`,
  ].filter(Boolean);
  return parts.join("\n");
}

export default function CheckoutSuccess() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id");
  const isPrint = params.get("type") === "print";

  const [order, setOrder] = useState<PrintOrder | null>(null);
  const [loading, setLoading] = useState(isPrint && !!sessionId);

  useEffect(() => {
    if (!isPrint || !sessionId) return;
    let attempts = 0;
    const maxAttempts = 8;

    async function poll() {
      try {
        const resp = await fetch(`/api/checkout/session/${sessionId}`);
        if (resp.ok) {
          const data = await resp.json();
          setOrder(data.order);
          setLoading(false);
          return;
        }
      } catch {}
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        setLoading(false);
      }
    }

    poll();
  }, [isPrint, sessionId]);

  if (!isPrint) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center animate-in fade-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-3">
          Welcome to StoryBloom!
        </h1>
        <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
          Your membership is now active. Go create your first personalized story — it's waiting for you.
        </p>
        <div className="bg-card border border-border/60 rounded-2xl p-6 mb-8 text-left">
          <div className="flex items-start gap-4">
            <BookHeart className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-foreground">You're all set</p>
              <p className="text-muted-foreground text-sm mt-1">
                Unlimited story generation is now unlocked. Create as many personalized bedtime stories as you like.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/create">
            <button className="px-8 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all">
              Create a story →
            </button>
          </Link>
          <Link href="/stories">
            <button className="px-8 py-3 bg-card border border-border text-foreground font-bold rounded-full hover:bg-muted/50 transition-all">
              My library
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4 text-center animate-in fade-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Order confirmed!</h1>
        <p className="text-muted-foreground text-lg animate-pulse">Loading your order details…</p>
      </div>
    );
  }

  const addr = order?.shipping_address
    ? typeof order.shipping_address === "string"
      ? JSON.parse(order.shipping_address)
      : order.shipping_address
    : null;

  return (
    <div className="max-w-lg mx-auto py-12 px-4 animate-in fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-2">
          Order confirmed!
        </h1>
        {order && (
          <p className="text-muted-foreground text-base">
            Order #{order.id} · {new Date(order.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>

      {/* Order card */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden mb-6">
        {/* Book info */}
        <div className="p-6 border-b border-border/40">
          <div className="flex items-start gap-4">
            {order?.cover_image_url ? (
              <img
                src={order.cover_image_url}
                alt="Cover"
                className="w-16 h-20 object-cover rounded-lg flex-shrink-0 shadow"
              />
            ) : (
              <div className="w-16 h-20 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-7 h-7 text-primary/60" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Personalised storybook</p>
              <p className="font-bold text-foreground text-lg leading-tight">
                {order?.story_title ?? "Your storybook"}
              </p>
              {order && (
                <p className="text-muted-foreground text-sm mt-1">
                  ${(order.amount_cents / 100).toFixed(2)} · 1 copy
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Shipping address */}
        {addr && (
          <div className="p-6 border-b border-border/40">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Shipping to</p>
                <p className="font-semibold text-foreground">{addr.name || order?.customer_name}</p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {formatAddress(addr)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="p-6">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">What happens next</p>
              <ol className="space-y-2 text-sm text-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold flex-shrink-0">✓</span>
                  Order received &amp; sent to printer
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold flex-shrink-0">2</span>
                  Printed &amp; bound — usually 3–5 business days
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold flex-shrink-0">3</span>
                  Shipped with tracking — Lulu will email you
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Lulu job ID — shown once the order has been sent to the printer */}
      {order?.lulu_job_id && (
        <div className="bg-muted/60 border border-border/60 rounded-xl p-4 mb-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Printer reference:</span>{" "}
          <span className="font-mono">{order.lulu_job_id}</span>
        </div>
      )}

      {/* Pending print submission — payment cleared but Lulu not yet contacted */}
      {order && order.status === "paid" && !order.lulu_job_id && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
          <strong>Your payment cleared.</strong> We're queuing your book for printing — this usually completes within a few minutes. If it stays here longer, visit{" "}
          <a href="/account" className="underline font-semibold">My Account</a> to resend it to the printer manually.
        </div>
      )}

      {/* Lulu submission error — visible to customer so they know to visit account page */}
      {order?.lulu_last_error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-800">
          <strong>Print submission issue:</strong> There was a problem sending your order to the printer. Your payment is safe.{" "}
          <a href="/account" className="underline font-semibold">Go to My Account</a> to resend it — or we'll retry automatically.
        </div>
      )}

      {/* Reassurance note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
        <strong>Keep this page bookmarked</strong> — it has your full order details. A tracking email from Lulu Direct will arrive once your book ships.
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/account">
          <button className="px-8 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all">
            View my orders
          </button>
        </Link>
        <Link href="/create">
          <button className="px-8 py-3 bg-card border border-border text-foreground font-bold rounded-full hover:bg-muted/50 transition-all">
            Create another story
          </button>
        </Link>
      </div>
    </div>
  );
}
