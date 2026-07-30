import { useRoute, Link } from "wouter";
import { useEffect, useState } from "react";
import { BookHeart, BookOpen } from "lucide-react";
import { Logo } from "@/components/logo";
import { format } from "date-fns";

function toImageUrl(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
  return `/api/storage${objectPath}`;
}

function parseIllustrations(illustrationUrls: string | null | undefined): string[] {
  if (!illustrationUrls) return [];
  try {
    return (JSON.parse(illustrationUrls) as string[]).map(p => `/api/storage${p}`);
  } catch {
    return [];
  }
}

export default function StoryShare() {
  const [, params] = useRoute("/share/:id");
  const id = params?.id ? parseInt(params.id, 10) : null;

  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/stories/${id}/public`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(data => {
        if (data) setStory(data);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 animate-pulse" />
          <p className="text-muted-foreground font-medium">Loading story…</p>
        </div>
      </div>
    );
  }

  if (notFound || !story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <BookHeart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold text-foreground mb-2">Story not found</h1>
          <p className="text-muted-foreground mb-6">This story may have been removed.</p>
          <Link href="/">
            <button className="px-6 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all">
              Create your own story
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const coverUrl = toImageUrl(story.coverImageUrl);
  const illustrations = parseIllustrations(story.illustrationUrls);
  const paragraphs = story.content.split('\n').filter(Boolean);

  const ILLUS_AFTER: Record<number, string> = {};
  if (illustrations[0]) ILLUS_AFTER[1] = illustrations[0];
  if (illustrations[1]) ILLUS_AFTER[3] = illustrations[1];

  return (
    <div className="min-h-screen bg-background">
      {/* Top banner */}
      <div className="bg-primary text-white py-3 px-4 text-center text-sm font-semibold">
        <span className="opacity-80">Made with </span>
        <Link href="/" className="underline underline-offset-2 font-bold hover:opacity-80 transition-opacity">
          Sion Legacy Originals
        </Link>
        <span className="opacity-80"> — AI-powered personalized bedtime stories for your child</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 pb-24">
        <div className="bg-card shadow-sm border border-border/60 rounded-[2.5rem] overflow-hidden">
          {/* Cover image */}
          {coverUrl && (
            <div className="relative w-full aspect-[9/14] overflow-hidden">
              <img src={coverUrl} alt={`Cover — ${story.title}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 text-white">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-bold rounded-full mb-4">
                  <BookHeart className="w-3.5 h-3.5" />
                  {story.theme}
                </span>
                <h1 className="text-3xl md:text-5xl font-serif font-bold leading-[1.1] text-balance drop-shadow-lg">
                  {story.title}
                </h1>
              </div>
            </div>
          )}

          {/* Header */}
          <div className={`bg-muted/30 p-8 md:p-14 border-b border-border/50 text-center relative overflow-hidden ${coverUrl ? 'py-6 md:py-8' : ''}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-bl-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-tr-full pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center">
              {!coverUrl && (
                <>
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-background border border-border text-foreground text-sm font-bold rounded-full mb-8 shadow-sm">
                    <BookHeart className="w-4 h-4 text-accent" />
                    {story.theme}
                  </span>
                  <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-8 leading-[1.1] text-balance">
                    {story.title}
                  </h1>
                </>
              )}
              <div className="text-muted-foreground font-medium flex items-center justify-center gap-2 flex-wrap text-base">
                <span>For <strong className="text-foreground bg-primary/10 px-2 py-0.5 rounded-md">{story.childName}</strong>, Age {story.childAge}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mx-2" />
                <span>{format(new Date(story.createdAt), 'MMMM d, yyyy')}</span>
              </div>
            </div>
          </div>

          {/* Story content */}
          <div className="p-8 md:p-16">
            <div className="prose prose-lg md:prose-xl max-w-none prose-p:font-serif prose-p:leading-[1.9] prose-p:text-foreground/90 prose-p:mb-6">
              {paragraphs.map((paragraph: string, i: number) => (
                <div key={i}>
                  <p>{paragraph}</p>
                  {ILLUS_AFTER[i] && (
                    <div className="my-8 rounded-2xl overflow-hidden shadow-md not-prose">
                      <img
                        src={ILLUS_AFTER[i]}
                        alt={`Illustration ${Object.keys(ILLUS_AFTER).indexOf(String(i)) + 1}`}
                        className="w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-card border-t border-border p-4 shadow-lg z-10">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="text-center sm:text-left">
            <p className="font-serif font-bold text-foreground text-sm">Create a personalized story for your child</p>
            <p className="text-xs text-muted-foreground">$1.11 per story · or $3.33/month unlimited</p>
          </div>
          <Link href="/sign-up">
            <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all shadow-md whitespace-nowrap">
              <Logo size={16} />
              Create your story
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
