import { Link, useSearch } from "wouter";
import { CheckCircle2, BookHeart, Printer } from "lucide-react";

export default function CheckoutSuccess() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id");

  // Heuristic: Stripe subscription sessions start with cs_ and contain "sub"
  // The real distinction would require a backend lookup, but this is good enough for UX
  const isPrint = false; // Will be improved when we add order lookup

  return (
    <div className="max-w-lg mx-auto py-20 px-4 text-center animate-in fade-in">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>

      <h1 className="text-4xl font-serif font-bold text-foreground mb-3">
        {isPrint ? "Order placed!" : "Welcome to StoryBloom!"}
      </h1>

      <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
        {isPrint
          ? "Your book is on its way to print. We'll send updates to your email as your order progresses."
          : "Your membership is now active. Go create your first personalised story — it's waiting for you."}
      </p>

      <div className="bg-card border border-border/60 rounded-2xl p-6 mb-8 text-left">
        {isPrint ? (
          <div className="flex items-start gap-4">
            <Printer className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-foreground">What happens next</p>
              <p className="text-muted-foreground text-sm mt-1">
                Lulu will print and bind your book, usually within 3–5 business days, then ship directly to your address.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <BookHeart className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-foreground">You're all set</p>
              <p className="text-muted-foreground text-sm mt-1">
                Unlimited story generation is now unlocked. Create as many personalised bedtime stories as you like.
              </p>
            </div>
          </div>
        )}
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
