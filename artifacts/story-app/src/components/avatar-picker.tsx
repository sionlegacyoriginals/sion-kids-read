import { useState, useEffect } from "react";
import { Loader2, Check, ImagePlus } from "lucide-react";

export interface Avatar {
  id: string;
  name: string;
  category: string;
  emoji: string;
  refPhotoPath: string;
  previewUrl: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  kids: "🧒 Kids",
  animals: "🦁 Animals",
  adventure: "🚀 Adventure",
  careers: "👨‍⚕️ Careers",
};

interface AvatarPickerProps {
  /** Currently selected ref-photo paths (e.g. ["/ref-photos/avatar_kid_001"]) */
  selected: string[];
  onChange: (paths: string[]) => void;
  maxSelect?: number;
  /** Optional base path prefix for API calls */
  basePath?: string;
  className?: string;
}

export function AvatarPicker({
  selected,
  onChange,
  maxSelect = 2,
  basePath = "",
  className = "",
}: AvatarPickerProps) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    fetch(`${basePath}/api/avatars`)
      .then((r) => r.json())
      .then((d) => {
        setAvatars(d.avatars ?? []);
      })
      .catch(() => setError("Could not load avatars"))
      .finally(() => setLoading(false));
  }, [basePath]);

  const categories = ["all", ...Array.from(new Set(avatars.map((a) => a.category)))];
  const visible = category === "all" ? avatars : avatars.filter((a) => a.category === category);

  function toggle(path: string) {
    if (selected.includes(path)) {
      onChange(selected.filter((p) => p !== path));
    } else if (selected.length < maxSelect) {
      onChange([...selected, path]);
    }
  }

  if (loading) {
    return (
      <div className={`flex justify-center py-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || avatars.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground text-center py-4 ${className}`}>
        {error || "No avatars available yet."}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              category === cat
                ? "bg-primary text-white border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Selection hint */}
      <p className="text-xs text-muted-foreground">
        {selected.length === 0
          ? `Choose up to ${maxSelect} character${maxSelect > 1 ? "s" : ""} — AI will use them to illustrate your story`
          : `${selected.length} of ${maxSelect} selected${selected.length < maxSelect ? " — you can pick one more" : ""}`}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {visible.map((avatar) => {
          const isSelected = selected.includes(avatar.refPhotoPath);
          const isDisabled = !isSelected && selected.length >= maxSelect;
          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => toggle(avatar.refPhotoPath)}
              disabled={isDisabled}
              title={avatar.name}
              className={`relative aspect-square rounded-2xl border-2 overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? "border-primary ring-2 ring-primary/30 scale-105"
                  : isDisabled
                  ? "border-transparent opacity-40 cursor-not-allowed"
                  : "border-transparent hover:border-primary/40 hover:scale-105"
              }`}
            >
              <img
                src={avatar.previewUrl}
                alt={avatar.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Selected checkmark overlay */}
              {isSelected && (
                <div className="absolute inset-0 bg-primary/20 flex items-end justify-end p-1">
                  <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </span>
                </div>
              )}
              {/* Name tooltip on hover (shown as caption on mobile) */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] font-semibold text-center py-0.5 leading-tight opacity-0 hover:opacity-100 transition-opacity pointer-events-none truncate px-1">
                {avatar.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected summary chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selected.map((path) => {
            const av = avatars.find((a) => a.refPhotoPath === path);
            if (!av) return null;
            return (
              <span
                key={path}
                className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-full"
              >
                <img src={av.previewUrl} alt={av.name} className="w-5 h-5 rounded-full object-cover" />
                {av.name}
                <button
                  type="button"
                  onClick={() => toggle(path)}
                  className="ml-0.5 text-primary/60 hover:text-primary leading-none"
                  aria-label={`Remove ${av.name}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * A compact inline toggle used on the parent story-creation page to switch
 * between "Upload a photo" and "Choose an avatar".
 */
export function ImageSourceToggle({
  mode,
  onChange,
}: {
  mode: "upload" | "avatar";
  onChange: (m: "upload" | "avatar") => void;
}) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
      {(["upload", "avatar"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            mode === m
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {m === "upload" ? (
            <>
              <ImagePlus className="w-3.5 h-3.5" /> Upload photo
            </>
          ) : (
            <>
              ✨ Avatar bank
            </>
          )}
        </button>
      ))}
    </div>
  );
}
