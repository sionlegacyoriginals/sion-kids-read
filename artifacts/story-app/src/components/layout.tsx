import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Show, useUser, useClerk } from "@clerk/react";
import { Sparkles, BookHeart, LogOut, Settings, ChevronDown } from "lucide-react";

function UserMenu() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Account";

  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  // Avatar: initials or profile image
  const initials = (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "");
  const avatarUrl = user?.imageUrl;

  return (
    <div ref={ref} className="relative ml-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {/* Avatar */}
        <span className="w-7 h-7 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-primary uppercase">
              {initials || "?"}
            </span>
          )}
        </span>
        <span className="hidden sm:block max-w-[120px] truncate">{displayName}</span>
        <ChevronDown className={`w-3.5 h-3.5 hidden sm:block transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary uppercase">
                    {initials || "?"}
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); openUserProfile(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
            >
              <Settings className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="font-medium">Manage account</div>
                <div className="text-xs text-muted-foreground">Name, email, password</div>
              </div>
            </button>

            <hr className="border-border mx-4 my-1" />

            <button
              onClick={() => { setOpen(false); signOut({ redirectUrl: basePath || "/" }); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <Sparkles className="w-6 h-6" />
            <span className="font-serif text-2xl font-bold tracking-tight">Sion Legacy Originals</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Show when="signed-in">
              <Link
                href="/create"
                className={`px-3 py-1.5 rounded-full font-medium text-sm transition-colors ${location === "/create" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              >
                Create
              </Link>
              <Link
                href="/stories"
                className={`px-3 py-1.5 rounded-full font-medium text-sm flex items-center gap-1.5 transition-colors ${location.startsWith("/stories") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              >
                <BookHeart className="w-3.5 h-3.5" /> Library
              </Link>
              <UserMenu />
            </Show>

            <Show when="signed-out">
              <Link href="/sign-in">
                <button className="px-4 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  Sign in
                </button>
              </Link>
              <Link href="/sign-up">
                <button className="px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-full hover:bg-primary/90 transition-all">
                  Get started
                </button>
              </Link>
            </Show>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12">
        {children}
      </main>
    </div>
  );
}
