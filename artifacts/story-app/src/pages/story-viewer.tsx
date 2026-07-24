import { useState, useCallback } from "react";
import { useRoute, useLocation, Link } from "wouter";
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
import { Printer, Edit3, Sparkles, Trash2, ArrowLeft, Save, X, BookHeart } from "lucide-react";
import { MagicLoader } from "@/components/magic-loader";

/** Convert a stored objectPath (/objects/...) to a serving URL */
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

export default function StoryViewer() {
  const [, params] = useRoute("/stories/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id, 10) : null;
  const queryClient = useQueryClient();

  const { data: story, isLoading } = useGetStory(id!, { query: { enabled: !!id, queryKey: getGetStoryQueryKey(id!) } });
  
  const updateStory = useUpdateStory();
  const deleteStory = useDeleteStory();
  const regenerateStory = useRegenerateStory();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const handleEditInit = useCallback(() => {
    if (story) {
      setEditTitle(story.title);
      setEditContent(story.content);
      setIsEditing(true);
    }
  }, [story]);

  const handleSave = () => {
    if (!id) return;
    updateStory.mutate({
      id,
      data: { title: editTitle, content: editContent }
    }, {
      onSuccess: (data) => {
        setIsEditing(false);
        queryClient.setQueryData(getGetStoryQueryKey(id), data);
        queryClient.invalidateQueries({ queryKey: getGetRecentStoriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListStoriesQueryKey() });
      }
    });
  };

  const handleRegenerate = () => {
    if (!id) return;
    regenerateStory.mutate({ id }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetStoryQueryKey(id), data);
      }
    });
  };

  const handleDelete = () => {
    if (!id || !confirm("Are you sure you want to delete this story?")) return;
    deleteStory.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRecentStoriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListStoriesQueryKey() });
        setLocation("/stories");
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !story) {
    return <div className="py-20 flex justify-center"><div className="animate-pulse w-12 h-12 bg-primary/20 rounded-full" /></div>;
  }

  if (regenerateStory.isPending) {
    return <MagicLoader message="Reweaving the magic…" />;
  }

  const coverUrl = toImageUrl(story.coverImageUrl);
  const illustrations = parseIllustrations(story.illustrationUrls);
  const paragraphs = story.content.split('\n').filter(Boolean);

  // Interleave illustrations: after paragraph 2 and paragraph 4
  const ILLUS_AFTER: Record<number, string> = {};
  if (illustrations[0]) ILLUS_AFTER[1] = illustrations[0]; // after para index 1 (2nd para)
  if (illustrations[1]) ILLUS_AFTER[3] = illustrations[1]; // after para index 3 (4th para)

  return (
    <div className="max-w-3xl mx-auto pb-24 animate-in fade-in duration-500">
      <Link href="/stories" className="no-print inline-flex items-center gap-2 text-muted-foreground hover:text-foreground font-bold mb-8 transition-colors">
        <ArrowLeft className="w-5 h-5" /> Back to Library
      </Link>

      <div className="bg-card shadow-sm border border-border/60 rounded-[2.5rem] overflow-hidden">
        {/* Cover image */}
        {coverUrl && (
          <div className="relative w-full aspect-[9/14] overflow-hidden">
            <img
              src={coverUrl}
              alt={`Cover — ${story.title}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 text-white">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-bold rounded-full mb-4">
                <BookHeart className="w-3.5 h-3.5" />
                {story.theme}
              </span>
              {!isEditing && (
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold leading-[1.1] text-balance drop-shadow-lg">
                  {story.title}
                </h1>
              )}
            </div>
          </div>
        )}

        {/* Header / Meta (no-cover variant or editing) */}
        <div className={`bg-muted/30 p-8 md:p-14 border-b border-border/50 text-center relative overflow-hidden ${coverUrl ? 'py-6 md:py-8' : ''}`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-bl-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-tr-full pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            {!coverUrl && (
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-background border border-border text-foreground text-sm font-bold rounded-full mb-8 shadow-sm">
                <BookHeart className="w-4 h-4 text-accent" />
                {story.theme}
              </span>
            )}
            
            {isEditing ? (
              <input 
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full text-center text-4xl md:text-5xl font-serif font-bold text-foreground bg-white/50 border-b-2 border-primary focus:outline-none mb-6 px-4 py-2 rounded-t-lg"
              />
            ) : !coverUrl ? (
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-8 leading-[1.1] story-title text-balance">
                {story.title}
              </h1>
            ) : null}

            <div className="text-muted-foreground font-medium flex items-center justify-center gap-2 flex-wrap text-base">
              <span>For <strong className="text-foreground bg-primary/10 px-2 py-0.5 rounded-md">{story.childName}</strong>, Age {story.childAge}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mx-2" />
              <span>{format(new Date(story.createdAt), 'MMMM d, yyyy')}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-16">
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full min-h-[500px] text-lg leading-relaxed bg-background/50 border border-border rounded-xl p-6 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y font-serif"
            />
          ) : (
            <div className="prose prose-lg md:prose-xl max-w-none prose-p:font-serif prose-p:leading-[1.9] prose-p:text-foreground/90 prose-p:mb-6 story-content">
              {paragraphs.map((paragraph, i) => (
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
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="no-print fixed bottom-8 left-1/2 -translate-x-1/2 bg-foreground/95 backdrop-blur-md text-background px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-8 z-50">
        {isEditing ? (
          <>
            <button 
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-full transition-colors font-bold text-sm"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={updateStory.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full transition-colors font-bold shadow-sm"
            >
              <Save className="w-4 h-4" /> Save
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-full transition-colors font-bold text-sm text-white/90 hover:text-white"
              title="Download PDF"
            >
              <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            <div className="w-px h-6 bg-white/20" />
            <button 
              onClick={handleEditInit}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-full transition-colors font-bold text-sm text-white/90 hover:text-white"
            >
              <Edit3 className="w-4 h-4" /> <span className="hidden sm:inline">Edit</span>
            </button>
            <div className="w-px h-6 bg-white/20" />
            <button 
              onClick={handleRegenerate}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-full transition-colors font-bold text-sm text-primary hover:text-primary/80"
            >
              <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">Regenerate</span>
            </button>
            <div className="w-px h-6 bg-white/20" />
            <button 
              onClick={handleDelete}
              disabled={deleteStory.isPending}
              className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/20 rounded-full transition-colors font-bold text-sm text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" /> <span className="hidden md:inline">Delete</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
