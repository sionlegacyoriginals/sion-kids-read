import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useListStories, useGetStoryStats, getListStoriesQueryKey, useDeleteStory } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Search, Filter, Package, Share2, Link2, Trash2, RotateCcw, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Logo } from "@/components/logo";
import { format } from "date-fns";
import { OrderDialog } from "@/components/order-dialog";
import { ShareDialog } from "@/components/share-dialog";
import { AddFromLinkDialog } from "@/components/add-from-link-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

function buildShareUrl(storyId: number) {
  return `${window.location.origin}/api/share/${storyId}`;
}

async function fetchTrash() {
  const res = await fetch("/api/stories/trash", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch trash");
  return res.json() as Promise<any[]>;
}

async function restoreStory(id: number) {
  const res = await fetch(`/api/stories/${id}/restore`, { method: "POST", credentials: "include" });
  if (!res.ok) throw new Error("Failed to restore");
  return res.json();
}

export default function Library() {
  const queryClient = useQueryClient();
  const { data: stories, isLoading: loadingStories } = useListStories();
  const { data: stats } = useGetStoryStats();
  const { data: trashedStories = [] } = useQuery({ queryKey: ["stories-trash"], queryFn: fetchTrash });

  const [search, setSearch] = useState("");
  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [orderingStoryId, setOrderingStoryId] = useState<number | null>(null);
  const [sharingStory, setSharingStory] = useState<{ id: number; title: string; childName: string } | null>(null);
  const [showAddFromLink, setShowAddFromLink] = useState(false);
  const [confirmDeleteStory, setConfirmDeleteStory] = useState<{ id: number; title: string } | null>(null);
  const [showTrash, setShowTrash] = useState(false);

  const { mutate: deleteStory, isPending: isDeleting } = useDeleteStory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStoriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["stories-trash"] });
        setConfirmDeleteStory(null);
      },
    },
  });

  const { mutate: restore, isPending: isRestoring } = useMutation({
    mutationFn: (id: number) => restoreStory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListStoriesQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["stories-trash"] });
    },
  });

  const handleShare = async (story: { id: number; title: string; childName: string }) => {
    const url = buildShareUrl(story.id);
    const text = `✨ I just made a personalized bedtime story for ${story.childName} on Sion Kids Read! Check it out 📖`;
    if (navigator.share) {
      try { await navigator.share({ title: story.title, text, url }); return; } catch {}
    }
    setSharingStory(story);
  };

  const filteredStories = useMemo(() => {
    if (!stories) return [];
    return stories.filter(story => {
      const matchesSearch = story.title.toLowerCase().includes(search.toLowerCase()) ||
                            story.childName.toLowerCase().includes(search.toLowerCase());
      const matchesTheme = themeFilter === "all" || story.theme === themeFilter;
      return matchesSearch && matchesTheme;
    });
  }, [stories, search, themeFilter]);

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
      {orderingStoryId !== null && (
        <OrderDialog storyId={orderingStoryId} onClose={() => setOrderingStoryId(null)} />
      )}
      {sharingStory && (
        <ShareDialog
          storyId={sharingStory.id}
          storyTitle={sharingStory.title}
          childName={sharingStory.childName}
          onClose={() => setSharingStory(null)}
        />
      )}
      {showAddFromLink && (
        <AddFromLinkDialog
          onClose={() => setShowAddFromLink(false)}
          onAdded={() => queryClient.invalidateQueries({ queryKey: getListStoriesQueryKey() })}
        />
      )}
      {confirmDeleteStory && (
        <DeleteConfirmDialog
          storyTitle={confirmDeleteStory.title}
          isDeleting={isDeleting}
          onConfirm={() => deleteStory({ id: confirmDeleteStory.id })}
          onCancel={() => setConfirmDeleteStory(null)}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif text-foreground">Story Library</h1>
          <p className="text-muted-foreground mt-3 text-lg flex items-center gap-2">
            <Logo size={20} />
            {stats ? `A collection of ${stats.totalStories} magical tales.` : "Your collection of tales."}
          </p>
        </div>
        <button
          onClick={() => setShowAddFromLink(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-primary text-sm font-bold transition-all shrink-0"
        >
          <Link2 className="w-4 h-4" />
          Add from link
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or child's name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          />
        </div>
        <div className="relative sm:w-64 shrink-0">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <select
            value={themeFilter}
            onChange={e => setThemeFilter(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow appearance-none"
          >
            <option value="all">All Themes</option>
            {stats?.byTheme.map(t => (
              <option key={t.theme} value={t.theme}>{t.theme} ({t.count})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active story grid */}
      {loadingStories ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="animate-pulse h-64 bg-card rounded-3xl border border-border/50" />
          ))}
        </div>
      ) : filteredStories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map(story => (
            <div key={story.id} className="group h-full flex flex-col rounded-3xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/10 to-transparent rounded-bl-full -mr-8 -mt-8 pointer-events-none transition-transform group-hover:scale-110" />

              <Link href={`/stories/${story.id}`} className="flex flex-col flex-1 p-6 cursor-pointer">
                <div className="inline-block px-3 py-1 bg-accent/15 text-accent-foreground text-xs font-bold rounded-full w-fit mb-4">
                  {story.theme}
                </div>
                <h3 className="text-2xl font-serif text-foreground font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                  {story.title}
                </h3>
                <p className="text-muted-foreground line-clamp-3 mb-6 flex-1 text-base leading-relaxed">
                  {story.content}
                </p>
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-foreground bg-primary/10 px-2 py-1 rounded-md">For {story.childName}</span>
                  <span className="text-muted-foreground">{format(new Date(story.createdAt), 'MMM d, yyyy')}</span>
                </div>
              </Link>

              <div className="px-6 pb-5 pt-0 flex gap-2">
                <button
                  onClick={() => setOrderingStoryId(story.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-primary text-sm font-bold transition-all"
                >
                  <Package className="w-4 h-4" />
                  Order — $33.33
                </button>
                <button
                  onClick={() => handleShare({ id: story.id, title: story.title, childName: story.childName })}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-muted/50 hover:bg-muted hover:border-border/80 text-foreground text-sm font-bold transition-all"
                  title="Share this story"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmDeleteStory({ id: story.id, title: story.title })}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-muted/50 hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive text-muted-foreground text-sm font-bold transition-all"
                  title="Delete this story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 px-4 border border-dashed border-border rounded-3xl bg-card/50">
          <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-serif text-foreground mb-2">No stories found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search term.</p>
        </div>
      )}

      {/* Recently Deleted section */}
      <div className="border border-border/60 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowTrash(v => !v)}
          className="w-full flex items-center justify-between gap-3 px-6 py-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-bold text-foreground text-sm">Recently Deleted</p>
              <p className="text-xs text-muted-foreground">
                {trashedStories.length > 0
                  ? `${trashedStories.length} stor${trashedStories.length === 1 ? "y" : "ies"} — tap to restore`
                  : "No deleted stories"}
              </p>
            </div>
          </div>
          {showTrash ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </button>

        {showTrash && (
          <div className="p-4 space-y-3 animate-in slide-in-from-top-2">
            {trashedStories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nothing in the trash.</p>
            ) : (
              <>
                <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  Stories here can be restored any time. They are never permanently removed unless you contact support to request it.
                </div>
                {trashedStories.map((story: any) => (
                  <div key={story.id} className="flex items-center gap-4 p-4 bg-card border border-border/60 rounded-2xl">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{story.title}</p>
                      <p className="text-xs text-muted-foreground">
                        For {story.childName} · Deleted {story.deletedAt ? format(new Date(story.deletedAt), "MMM d, yyyy") : "recently"}
                      </p>
                    </div>
                    <button
                      onClick={() => restore(story.id)}
                      disabled={isRestoring}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-bold hover:bg-primary/20 transition-all disabled:opacity-50 shrink-0"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
