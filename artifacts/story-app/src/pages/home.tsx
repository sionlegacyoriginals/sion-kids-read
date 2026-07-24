import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useUser } from "@clerk/react";
import { 
  useCreateStory, 
  useGetRecentStories, 
  getGetRecentStoriesQueryKey, 
  getListStoriesQueryKey, 
  getGetStoryStatsQueryKey 
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MagicLoader } from "@/components/magic-loader";
import { BookOpen, ArrowRight, Sparkles, Feather, BookMarked, ImagePlus, X, Loader2, BookHeart, Star, Printer } from "lucide-react";
import { format } from "date-fns";
import { useUpload } from "@workspace/object-storage-web";

const THEMES = [
  // Original
  'Courage', 'Kindness', 'Overcoming Fear',
  'Faith', 'Friendship', 'Honesty',
  'Perseverance', 'Gratitude',
  // New additions
  'Forgiveness', 'Compassion', 'Patience',
  'Generosity', 'Humility', 'Loyalty',
  'Joy', 'Hope', 'Love',
  'Self-Control', 'Trustworthiness', 'Responsibility',
  'Creativity', 'Curiosity', 'Adventure',
  'Teamwork', 'Respect', 'Empathy',
  'Sharing', 'Diligence', 'Contentment',
  'Bravery', 'Wisdom', 'Acceptance',
  'Thankfulness', 'Service', 'Peacemaking',
  'Integrity', 'Helpfulness', 'Wonder',
] as const;

const storySchema = z.object({
  childName: z.string().min(1, "Child's name is required"),
  childAge: z.coerce.number().min(1, "Must be at least 1").max(12, "Must be 12 or younger"),
  childGender: z.enum(['boy', 'girl']),
  theme: z.enum(THEMES),
  milestones: z.string().optional(),
  customPrompt: z.string().optional(),
});

type StoryFormValues = z.infer<typeof storySchema>;

interface UploadedImage {
  objectPath: string;
  previewUrl: string;
}

const MAX_IMAGES = 5;

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const createStory = useCreateStory();
  const { data: recentStories, isLoading: loadingRecent } = useGetRecentStories();

  // Fetch access status up front so the gate is instant on Generate click
  const { data: me } = useQuery({
    queryKey: ["users-me"],
    queryFn: async () => {
      const r = await fetch("/api/users/me", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch user");
      return r.json();
    },
  });

  const hasAccess = me?.hasSubscription || me?.hasAccessCode || (me?.storyCredits ?? 0) > 0;

  // Paywall modal state — auto-open if ?paywall=1 is in the URL (returning from cancelled Stripe checkout)
  const [showPaywall, setShowPaywall] = useState(() => new URLSearchParams(window.location.search).get("paywall") === "1");
  const [paywallLoading, setPaywallLoading] = useState<"story" | "subscription" | null>(null);
  const [paywallError, setPaywallError] = useState<string | null>(null);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [accessCodeLoading, setAccessCodeLoading] = useState(false);
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);

  const handleRedeemCode = async () => {
    const code = accessCodeInput.trim();
    if (!code) return;
    setAccessCodeLoading(true);
    setAccessCodeError(null);
    try {
      const resp = await fetch("/api/access-code/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Invalid code");
      // Refresh access status and close modal
      await queryClient.invalidateQueries({ queryKey: ["users-me"] });
      setShowPaywall(false);
      setAccessCodeInput("");
    } catch (err: any) {
      setAccessCodeError(err.message);
    } finally {
      setAccessCodeLoading(false);
    }
  };

  const handlePaywallCheckout = async (type: "story" | "subscription") => {
    setPaywallLoading(type);
    setPaywallError(null);
    try {
      const endpoint = type === "story" ? "/api/checkout/story" : "/api/checkout/subscription";
      const resp = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.primaryEmailAddress?.emailAddress }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err: any) {
      setPaywallError(err.message);
      setPaywallLoading(null);
    }
  };

  // Bible verse state
  const [includeBibleVerse, setIncludeBibleVerse] = useState(false);
  const [bibleVerseMode, setBibleVerseMode] = useState<"auto" | "custom">("auto");
  const [customVerse, setCustomVerse] = useState("");

  // Image upload state
  const [uploadedImages, setUploadedImages] = useState<(UploadedImage | null)[]>(
    Array(MAX_IMAGES).fill(null)
  );
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<number>(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const { uploadFile } = useUpload({
    onError: () => setUploadingSlot(null),
  });

  const handleSlotClick = (idx: number) => {
    if (uploadingSlot !== null) return;
    activeSlotRef.current = idx;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Remount the input element so the next slot click always opens a fresh dialog
    setFileInputKey(k => k + 1);

    const idx = activeSlotRef.current;
    setUploadingSlot(idx);

    const previewUrl = URL.createObjectURL(file);
    const result = await uploadFile(file);
    setUploadingSlot(null);

    if (result) {
      setUploadedImages(prev => {
        const next = [...prev];
        next[idx] = { objectPath: result.objectPath, previewUrl };
        return next;
      });
    }
  };

  const removeImage = (idx: number) => {
    setUploadedImages(prev => {
      const next = [...prev];
      if (next[idx]?.previewUrl) URL.revokeObjectURL(next[idx]!.previewUrl);
      next[idx] = null;
      return next;
    });
  };

  const filledImages = uploadedImages.filter(Boolean) as UploadedImage[];

  const { register, handleSubmit, formState: { errors } } = useForm<StoryFormValues>({
    resolver: zodResolver(storySchema),
    defaultValues: {
      childName: "",
      childAge: 5,
      childGender: "boy",
      theme: "Courage",
      milestones: "",
      customPrompt: "",
    }
  });

  const onSubmit = (data: StoryFormValues) => {
    // Gate: show paywall modal if user has no access
    if (!hasAccess) {
      setShowPaywall(true);
      return;
    }

    const bibleVerse = !includeBibleVerse
      ? undefined
      : bibleVerseMode === "auto"
        ? "auto"
        : customVerse.trim() || undefined;

    const referenceImagePaths = filledImages.length > 0
      ? JSON.stringify(filledImages.map(i => i.objectPath))
      : undefined;

    setGenerationError(null);
    createStory.mutate({
      data: {
        childName: data.childName,
        childAge: data.childAge,
        childGender: data.childGender,
        theme: data.theme as any,
        milestones: data.milestones,
        customPrompt: data.customPrompt,
        bibleVerse,
        referenceImagePaths,
      }
    }, {
      onSuccess: (story) => {
        queryClient.invalidateQueries({ queryKey: getGetRecentStoriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListStoriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStoryStatsQueryKey() });
        setLocation(`/stories/${story.id}`);
      },
      onError: (err: any) => {
        const status = err?.status ?? 0;
        const msg = String(err?.message ?? err ?? "");
        if (status === 402 || msg.includes("402") || msg.includes("SUBSCRIPTION_REQUIRED")) {
          setLocation("/subscribe");
        } else if (status === 401 || msg.includes("401") || msg.includes("Unauthorized")) {
          setLocation("/sign-in");
        } else {
          setGenerationError("Something went wrong generating your story. Please try again.");
        }
      },
    });
  };

  if (createStory.isPending) {
    return (
      <MagicLoader
        message={
          filledImages.length > 0
            ? "Writing your tale & painting the pictures…"
            : "Writing a magical tale…"
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="lg:col-span-2 space-y-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif text-foreground mb-4">Create a New Tale</h1>
          <p className="text-lg text-muted-foreground">Fill in the details below to generate a unique, personalized bedtime story.</p>
        </div>

        <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-bl-full pointer-events-none" />
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Child's Name</label>
                <input 
                  {...register("childName")} 
                  placeholder="e.g. Leo"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
                {errors.childName && <p className="text-destructive text-sm font-medium">{errors.childName.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Age</label>
                <input 
                  type="number"
                  {...register("childAge")} 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
                {errors.childAge && <p className="text-destructive text-sm font-medium">{errors.childAge.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Gender</label>
                <select 
                  {...register("childGender")}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                >
                  <option value="boy">Boy</option>
                  <option value="girl">Girl</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Theme & Value</label>
                <select 
                  {...register("theme")}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                >
                  {THEMES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground flex items-center gap-2">
                Special Memories & Milestones
                <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              </label>
              <textarea 
                {...register("milestones")} 
                placeholder="Favorite toys, pets, recent trips, or big achievements..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[100px] resize-y placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground flex items-center gap-2">
                Custom Prompt
                <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              </label>
              <textarea 
                {...register("customPrompt")} 
                placeholder="A specific plot, e.g. discovering a hidden treehouse in the backyard..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[100px] resize-y placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Reference Photos */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ImagePlus className="w-4 h-4" />
                  Reference Photos
                  <span className="text-xs font-normal text-muted-foreground">(Optional — up to 5)</span>
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload photos of your child and AI will paint a personalised cover image and illustrations for the book.
                </p>
              </div>

              {/* Hidden file input — key forces remount so every slot click gets a fresh element */}
              <input
                key={fileInputKey}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: MAX_IMAGES }).map((_, idx) => {
                  const img = uploadedImages[idx];
                  const isUploading = uploadingSlot === idx;

                  return (
                    <div key={idx} className="relative aspect-square">
                      {img ? (
                        <div className="w-full h-full rounded-xl overflow-hidden border-2 border-primary/30 group">
                          <img
                            src={img.previewUrl}
                            alt={`Reference ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 w-5 h-5 bg-foreground/80 text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSlotClick(idx)}
                          disabled={uploadingSlot !== null}
                          className={`w-full h-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors gap-1 ${
                            isUploading
                              ? "border-primary/50 bg-primary/5"
                              : "border-border hover:border-primary/40 hover:bg-primary/5"
                          }`}
                        >
                          {isUploading ? (
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <ImagePlus className="w-5 h-5 text-muted-foreground/50" />
                              <span className="text-[10px] text-muted-foreground/50 font-medium">Add</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {filledImages.length > 0 && (
                <p className="text-xs text-primary font-medium">
                  ✨ {filledImages.length} photo{filledImages.length > 1 ? "s" : ""} uploaded — AI will illustrate the book
                </p>
              )}
            </div>

            {/* Bible Verse Section */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIncludeBibleVerse(v => !v)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  includeBibleVerse
                    ? "border-primary/50 bg-primary/5 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2 font-bold text-sm">
                  <BookMarked className="w-4 h-4" />
                  Include a Bible Verse
                </span>
                <span className={`w-9 h-5 rounded-full flex items-center transition-colors px-0.5 ${includeBibleVerse ? "bg-primary" : "bg-border"}`}>
                  <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${includeBibleVerse ? "translate-x-4" : "translate-x-0"}`} />
                </span>
              </button>

              {includeBibleVerse && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setBibleVerseMode("auto")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition-all ${
                        bibleVerseMode === "auto"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      ✨ Let AI choose
                    </button>
                    <button
                      type="button"
                      onClick={() => setBibleVerseMode("custom")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition-all ${
                        bibleVerseMode === "custom"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      📖 I have one in mind
                    </button>
                  </div>

                  {bibleVerseMode === "auto" ? (
                    <p className="text-xs text-muted-foreground">AI will weave in a fitting verse that matches the story's theme.</p>
                  ) : (
                    <input
                      type="text"
                      value={customVerse}
                      onChange={e => setCustomVerse(e.target.value)}
                      placeholder='e.g. "John 3:16" or paste the verse text'
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow text-sm"
                    />
                  )}
                </div>
              )}
            </div>

            {generationError && (
              <div className="text-red-600 text-sm text-center py-2 px-4 bg-red-50 border border-red-200 rounded-xl">
                {generationError}
              </div>
            )}

            <button 
              type="submit"
              disabled={uploadingSlot !== null}
              className="w-full py-4 px-6 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Feather className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
              Generate Story
            </button>
          </form>
        </div>
      </div>

      {/* Paywall modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-serif font-bold text-foreground text-center mb-1">
              Unlock this story
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Choose how you'd like to continue.
            </p>

            {paywallError && (
              <p className="text-red-600 text-sm text-center mb-4 bg-red-50 border border-red-200 rounded-xl py-2 px-3">
                {paywallError}
              </p>
            )}

            <div className="space-y-3">
              {/* $1 single story */}
              <button
                onClick={() => handlePaywallCheckout("story")}
                disabled={paywallLoading !== null}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left disabled:opacity-60"
              >
                <span className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BookHeart className="w-5 h-5 text-primary" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground">One story — $1</div>
                  <div className="text-xs text-muted-foreground">Pay once, generate this story</div>
                </div>
                {paywallLoading === "story" && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
              </button>

              {/* $3.33/month */}
              <button
                onClick={() => handlePaywallCheckout("subscription")}
                disabled={paywallLoading !== null}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left disabled:opacity-60"
              >
                <span className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground flex items-center gap-2">
                    Membership — $3.33/mo
                    <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-bold">Best value</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Unlimited stories, cancel anytime</div>
                </div>
                {paywallLoading === "subscription" && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
              </button>
            </div>

            {/* Access code */}
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-3">Have an access code?</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={accessCodeInput}
                  onChange={e => { setAccessCodeInput(e.target.value); setAccessCodeError(null); }}
                  onKeyDown={e => e.key === "Enter" && handleRedeemCode()}
                  placeholder="Enter code"
                  className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={handleRedeemCode}
                  disabled={accessCodeLoading || !accessCodeInput.trim()}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {accessCodeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Apply
                </button>
              </div>
              {accessCodeError && (
                <p className="text-red-500 text-xs mt-2 text-center">{accessCodeError}</p>
              )}
            </div>

            <button
              onClick={() => setShowPaywall(false)}
              className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif text-foreground">Recent Tales</h2>
          <Link href="/stories" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
            See all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingRecent ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex gap-4 p-4 rounded-2xl bg-card border border-border/50">
                <div className="w-12 h-12 bg-muted rounded-xl"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentStories?.length ? (
          <div className="space-y-4">
            {recentStories.map(story => (
              <Link key={story.id} href={`/stories/${story.id}`}>
                <div className="group flex gap-4 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer bg-gradient-to-r hover:from-card hover:to-primary/5">
                  <div className="w-12 h-12 bg-accent/20 text-accent-foreground rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-transform">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{story.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      For {story.childName} • {format(new Date(story.createdAt), 'MMM d')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 border border-dashed border-border rounded-2xl bg-card/50">
            <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No stories yet. Create your first one!</p>
          </div>
        )}
      </div>
    </div>
  );
}
