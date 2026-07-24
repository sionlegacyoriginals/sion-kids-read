import { Link, useLocation } from "wouter";
import { Show, useUser, useClerk } from "@clerk/react";
import { Sparkles, BookHeart, User, LogOut, CreditCard } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <Sparkles className="w-6 h-6" />
            <span className="font-serif text-2xl font-bold tracking-tight">StoryBloom</span>
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

            <Show when="signed-in">
              {/* User menu */}
              <div className="relative group ml-2">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:block max-w-[120px] truncate">
                    {user?.primaryEmailAddress?.emailAddress?.split("@")[0]}
                  </span>
                </button>
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link href="/account">
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors">
                      <CreditCard className="w-4 h-4" /> Account &amp; billing
                    </button>
                  </Link>
                  <hr className="border-border my-1" />
                  <button
                    onClick={() => signOut({ redirectUrl: basePath || "/" })}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              </div>
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
