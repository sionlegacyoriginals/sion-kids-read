import { useState, useCallback, useEffect } from "react";
import { useRoute, useLocation, useSearch, Link } from "wouter";
import { 
  useGetStory, 
  useUpdateStory, 
  useDeleteStory, 
  useRegenerateStory,
  getGetStoryQueryKey,
  getGetRecentStoriesQueryKey,
  getListStoriesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Printer, BookHeart, Package, ArrowLeft
} from "lucide-react";
import { MagicLoader } from "@/components/magic-loader";
import { OrderDialog } from "@/components/order-dialog";
import {
  useReadAlong,
  ReadAloudButton,
  ReadAlongBar,
  ReadAlongParagraph,
} from "@/components/read-along-player";

/** Convert a stored objectPath to a serving URL */
function toImageUrl(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
  if (objectPath.startsWith('/ref-photos/')) return `/api${objectPath}`;
  return `/api/storage${objectPath}`;
}

function parseIllustrations(illustrationUrls: string | null | undefined): string[] {
  if (!illustrationUrls) return [];
  try {
    return (JSON.parse(illustrationUrls) as string[]).map(p =>
      p.startsWith('/ref-photos/') ? `/api${p}` : `/api/storage${p}`
    );
  } catch {
    return [];
  }
}

export default function StoryViewer() {
  const [, params] = useRoute("/stories/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id, 10) : null;
  const queryClient = useQueryClient();

  const { data: story, isLoading } = useGetStory(id!, { query: { enabled: !!id, queryKey: getGetStoryQueryKey(id!) } });

  // Poll every 5 s while illustrations are still being painted in the background
  const pendingImages = !!story && !story.coverImageUrl && !!story.referenceImagePaths;
  useEffect(() => {
    if (!pendingImages || !id) return;
    const timer = setInterval(() => {
      queryClient.refetchQueries({ queryKey: getGetStoryQueryKey(id), type: 'active' });
    }, 5000);
    return () => clearInterval(timer);
  }, [pendingImages, id, queryClient]);

  const deleteStory = useDeleteStory();
  const regenerateStory = useRegenerateStory();

  const search = useSearch();
  const autoOrder = new URLSearchParams(search).get("order") === "1";
  const [showOrderDialog, setShowOrderDialog] = useState(false);

  // Auto-open order dialog when arriving from book-bundle checkout
  useEffect(() => {
    if (autoOrder && story && !isLoading) setShowOrderDialog(true);
  }, [autoOrder, story, isLoading]);

  const handleDelete = useCallback(() => {
    if (!id || !confirm("Are you sure you want to delete this story?")) return;
    deleteStory.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRecentStoriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListStoriesQueryKey() });
        setLocation("/stories");
      }
    });
  }, [id, deleteStory, queryClient, setLocation]);

  const handleRegenerate = useCallback(() => {
    if (!id) return;
    regenerateStory.mutate({ id }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetStoryQueryKey(id), data);
      }
    });
  }, [id, regenerateStory, queryClient]);

  // Read-along — must be called before any early returns (Rules of Hooks)
  const paragraphs = story ? story.content.split('\n').filter(Boolean) : [];
  const readAlong = useReadAlong(paragraphs);

  if (isLoading || !story) {
    return <div className="py-20 flex justify-center"><div className="animate-pulse w-12 h-12 bg-primary/20 rounded-full" /></div>;
  }

  if (regenerateStory.isPending) {
    return <MagicLoader message="Reweaving the magic…" />;
  }

  const coverUrl = toImageUrl(story.coverImageUrl);
  const illustrations = parseIllustrations(story.illustrationUrls);

  const ILLUS_AFTER: Record<number, string> = {};
  if (illustrations[0]) ILLUS_AFTER[1] = illustrations[0];
  if (illustrations[1]) ILLUS_AFTER[3] = illustrations[1];

  return (
    <div className={`max-w-3xl mx-auto pb-16 animate-in fade-in duration-500 ${readAlong.visible ? "pb-32" : ""}`}>
      {showOrderDialog && id && (
        <OrderDialog storyId={id} onClose={() => setShowOrderDialog(false)} />
      )}

      {readAlong.visible && (
        <ReadAlongBar
          childName={story.childName}
          isPlaying={readAlong.isPlaying}
          togglePlay={readAlong.togglePlay}
          stop={readAlong.stop}
          close={readAlong.close}
          speed={readAlong.speed}
          changeSpeed={readAlong.changeSpeed}
          pitch={readAlong.pitch}
          changePitch={readAlong.changePitch}
          voices={readAlong.voices}
          selectedVoice={readAlong.selectedVoice}
          changeVoice={readAlong.changeVoice}
          boundarySupported={readAlong.boundarySupported}
        />
      )}

      {/* Top nav row */}
      <div className="no-print flex items-center justify-between mb-8 flex-wrap gap-2">
        <Link href="/stories" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground font-bold transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to Library
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          {!readAlong.visible && (
            <ReadAloudButton onClick={readAlong.open} />
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
            title="Save as PDF"
          >
            <Printer className="w-4 h-4" /> Save to device
          </button>
          <button
            onClick={() => setShowOrderDialog(true)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Package className="w-4 h-4" /> Order printed book — $33.33
          </button>
        </div>
      </div>

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
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold leading-[1.1] text-balance drop-shadow-lg">
                {story.title}
              </h1>
            </div>
          </div>
        )}

        {/* Header / Meta */}
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
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-8 leading-[1.1] story-title text-balance">
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

        {/* Content */}
        <div className="p-8 md:p-16">
          <div className="prose prose-lg md:prose-xl max-w-none prose-p:font-serif prose-p:leading-[1.9] prose-p:text-foreground/90 prose-p:mb-6 story-content">
            {readAlong.paragraphData.map((pd, i) => (
              <div key={i}>
                <ReadAlongParagraph
                  tokens={pd.tokens}
                  activeCharIndex={readAlong.activeCharIndex}
                />
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

        {/* Bottom CTA */}
        <div className="no-print border-t border-border/50 p-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20">
          <div>
            <p className="font-serif font-bold text-foreground">Turn this story into a real book</p>
            <p className="text-sm text-muted-foreground">6"×9" full-colour softcover, printed &amp; shipped by Lulu Direct</p>
          </div>
          <button
            onClick={() => setShowOrderDialog(true)}
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Package className="w-4 h-4" /> Order printed book — $33.33
          </button>
        </div>
      </div>
    </div>
  );
}
