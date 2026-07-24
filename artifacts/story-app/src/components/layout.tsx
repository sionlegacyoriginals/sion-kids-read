import { Link, useLocation } from "wouter";
import { Sparkles, BookHeart } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <Sparkles className="w-6 h-6" />
            <span className="font-serif text-2xl font-bold tracking-tight">StoryBloom</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link 
              href="/" 
              className={`font-medium transition-colors ${location === '/' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Create
            </Link>
            <Link 
              href="/stories" 
              className={`font-medium flex items-center gap-2 transition-colors ${location.startsWith('/stories') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <BookHeart className="w-4 h-4" /> Library
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-12">
        {children}
      </main>
    </div>
  );
}
