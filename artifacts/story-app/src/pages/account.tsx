import { useState } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  User, CreditCard, Printer, CheckCircle2, XCircle,
  Loader2, LogOut, Package, Send
} from "lucide-react";

async function fetchUserMe() {
  const resp = await fetch("/api/users/me", { credentials: "include" });
  if (!resp.ok) throw new Error("Failed to fetch user");
  return resp.json();
}

async function fetchOrders() {
  const resp = await fetch("/api/checkout/orders", { credentials: "include" });
  if (!resp.ok) throw new Error("Failed to fetch orders");
  return resp.json();
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Payment received",
  sent_to_lulu: "Sent to printer",
  in_production: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function Account() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [retriggerLoading, setRetriggerLoading] = useState<number | null>(null);
  const [retriggerMsg, setRetriggerMsg] = useState<Record<number, string>>({});

  const handleRetrigger = async (orderId: number) => {
    setRetriggerLoading(orderId);
    setRetriggerMsg(m => ({ ...m, [orderId]: "" }));
    try {
      const resp = await fetch(`/api/checkout/orders/${orderId}/retrigger-lulu`, {
        method: "POST",
        credentials: "include",
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Failed");
      setRetriggerMsg(m => ({ ...m, [orderId]: "✓ Sent to Lulu! Check your email for shipping updates." }));
      queryClient.invalidateQueries({ queryKey: ["print-orders"] });
    } catch (err: any) {
      setRetriggerMsg(m => ({ ...m, [orderId]: `Error: ${err.message}` }));
    } finally {
      setRetriggerLoading(null);
    }
  };

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["users-me"],
    queryFn: fetchUserMe,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["print-orders"],
    queryFn: fetchOrders,
  });

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const resp = await fetch("/api/checkout/portal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Failed to open billing portal");
      window.location.href = data.url;
    } catch (err: any) {
      setPortalError(err.message);
      setPortalLoading(false);
    }
  };

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in space-y-6">
      <h1 className="text-3xl font-serif font-bold text-foreground">My Account</h1>

      {/* Profile card */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 flex items-center gap-5">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground truncate">
            {user?.fullName || user?.primaryEmailAddress?.emailAddress}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
        <button
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-semibold transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      {/* Subscription card */}
      <div className="bg-card border border-border/60 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg text-foreground">Membership</h2>
        </div>

        {meLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : me?.hasSubscription ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-green-700">Active — $3.33/month</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {me.storyCount} {me.storyCount === 1 ? "story" : "stories"} created
            </p>
            {portalError && <p className="text-red-600 text-sm">{portalError}</p>}
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-muted text-foreground font-semibold rounded-full hover:bg-muted/80 transition-all text-sm disabled:opacity-60"
            >
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Manage subscription
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">No active membership</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {me?.storyCount ?? 0} of 1 free {me?.storyCount === 1 ? "story" : "stories"} used
            </p>
            <Link href="/subscribe">
              <button className="px-6 py-2.5 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all text-sm">
                Subscribe — $3.33/mo
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Print orders */}
      <div className="bg-card border border-border/60 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Printer className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg text-foreground">Print Orders</h2>
        </div>

        {ordersLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : !ordersData?.orders?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No print orders yet.</p>
            <p className="text-xs mt-1">Open any story and click "Order Printed Book".</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ordersData.orders.map((order: any) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">
                    {order.story_title ?? "Untitled story"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()} ·{" "}
                    {order.customer_name}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right space-y-1.5">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    order.status === "shipped" || order.status === "delivered"
                      ? "bg-green-100 text-green-700"
                      : order.status === "paid"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    ${((order.amount_cents ?? 0) / 100).toFixed(2)}
                  </p>
                  {order.status === "paid" && (
                    <button
                      onClick={() => handleRetrigger(order.id)}
                      disabled={retriggerLoading === order.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary/90 transition-all disabled:opacity-60 ml-auto"
                    >
                      {retriggerLoading === order.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Send className="w-3 h-3" />}
                      Send to printer
                    </button>
                  )}
                  {retriggerMsg[order.id] && (
                    <p className={`text-xs mt-1 ${retriggerMsg[order.id].startsWith("Error") ? "text-destructive" : "text-green-600"}`}>
                      {retriggerMsg[order.id]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
