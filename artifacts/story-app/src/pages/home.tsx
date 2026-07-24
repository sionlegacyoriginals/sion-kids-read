import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { 
  useCreateStory, 
  useGetRecentStories, 
  getGetRecentStoriesQueryKey, 
  getListStoriesQueryKey, 
  getGetStoryStatsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MagicLoader } from "@/components/magic-loader";
import { BookOpen, ArrowRight, Sparkles, Feather } from "lucide-react";
import { format } from "date-fns";

const THEMES = [
  'Courage', 'Kindness', 'Overcoming Fear', 
  'Faith', 'Friendship', 'Honesty', 
  'Perseverance', 'Gratitude'
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

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createStory = useCreateStory();
  const { data: recentStories, isLoading: loadingRecent } = useGetRecentStories();

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
    createStory.mutate({
      data: {
        childName: data.childName,
        childAge: data.childAge,
        childGender: data.childGender,
        theme: data.theme as any,
        milestones: data.milestones,
        customPrompt: data.customPrompt
      }
    }, {
      onSuccess: (story) => {
        queryClient.invalidateQueries({ queryKey: getGetRecentStoriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListStoriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStoryStatsQueryKey() });
        setLocation(`/stories/${story.id}`);
      }
    });
  };

  if (createStory.isPending) {
    return <MagicLoader message="Writing a magical tale..." />;
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

            <button 
              type="submit"
              className="w-full py-4 px-6 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group shadow-sm hover:shadow active:scale-[0.99]"
            >
              <Feather className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
              Generate Story
            </button>
          </form>
        </div>
      </div>

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
