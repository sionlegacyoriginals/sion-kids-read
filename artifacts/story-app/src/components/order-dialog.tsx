import { useState } from "react";
import { X, Package, Loader2 } from "lucide-react";

interface ShippingForm {
  customerName: string;
  customerEmail: string;
  phone: string;
  street1: string;
  street2: string;
  city: string;
  state_code: string;
  postcode: string;
  country_code: string;
}

const EMPTY_SHIPPING: ShippingForm = {
  customerName: "", customerEmail: "", phone: "",
  street1: "", street2: "",
  city: "", state_code: "", postcode: "", country_code: "US",
};

export function OrderDialog({
  storyId,
  onClose,
  defaultEmail = "",
  defaultName = "",
}: {
  storyId: number;
  onClose: () => void;
  defaultEmail?: string;
  defaultName?: string;
}) {
  const [form, setForm] = useState<ShippingForm>({
    ...EMPTY_SHIPPING,
    customerEmail: defaultEmail,
    customerName: defaultName,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof ShippingForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/checkout/print", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId,
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          shippingAddress: {
            name: form.customerName,
            phone_number: form.phone,
            street1: form.street1,
            street2: form.street2 || undefined,
            city: form.city,
            state_code: form.state_code,
            postcode: form.postcode,
            country_code: form.country_code,
          },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-start justify-between">
          <div>
            <h2 className="font-serif font-bold text-xl text-foreground">Order Printed Book</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              6"×9" full-colour softcover · <strong className="text-foreground">$33.33</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-foreground">Full name</label>
              <input required value={form.customerName} onChange={set("customerName")}
                placeholder="Jane Smith"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-foreground">Email</label>
              <input required type="email" value={form.customerEmail} onChange={set("customerEmail")}
                placeholder="you@example.com"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-foreground">Phone number</label>
              <input required type="tel" value={form.phone} onChange={set("phone")}
                placeholder="555-867-5309"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-foreground">Street address</label>
              <input required value={form.street1} onChange={set("street1")}
                placeholder="123 Maple Street"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-foreground">Apt / Suite <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input value={form.street2} onChange={set("street2")}
                placeholder="Apt 4B"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">City</label>
              <input required value={form.city} onChange={set("city")}
                placeholder="Austin"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">State</label>
              <input required value={form.state_code} onChange={set("state_code")}
                placeholder="TX"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">ZIP / Postcode</label>
              <input required value={form.postcode} onChange={set("postcode")}
                placeholder="78701"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Country</label>
              <select value={form.country_code} onChange={set("country_code")}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="NZ">New Zealand</option>
                <option value="IE">Ireland</option>
                <option value="ZA">South Africa</option>
              </select>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to checkout…</>
            ) : (
              <><Package className="w-4 h-4" /> Pay $33.33 &amp; order →</>
            )}
          </button>
          <p className="text-[11px] text-center text-muted-foreground">
            Secure checkout via Stripe · Printed &amp; shipped by Lulu Direct · Usually ships in 3–5 business days
          </p>
        </form>
      </div>
    </div>
  );
}
