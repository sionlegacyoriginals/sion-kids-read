import { useState, useEffect, useRef } from "react";
import { X, Link2, BookPlus, Check, Loader2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

interface StoryPreview {
  id: number;
  title: string;
  childName: string;
  theme: string;
  content: string;
}

interface AddFromLinkDialogProps {
  onClose: () => void;
  onAdded: () => void;
}

function parseStoryId(input: string): number | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  // matches /api/share/12 or /share/12 anywhere in the URL
  const match = trimmed.match(/\/(?:api\/)?share\/(\d+)/);
  if (match) return parseInt(match[1], 10);
  return null;
}

export function AddFromLinkDialog({ onClose, onAdded }: AddFromLinkDialogProps) {
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<StoryPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const storyId = parseStoryId(input);

    if (!storyId) {
      setPreview(null);
      setPreviewError(input.trim().length > 3 ? "Couldn't find a story ID in that link." : null);
      return;
    }

    setPreviewError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      setPreview(null);
      try {
        const res = await fetch(`/api/stories/${storyId}/public`);
        if (!res.ok) throw new Error("Story not found");
        const data = await res.json();
        setPreview({ id: storyId, title: data.title, childName: data.childName, theme: data.theme, content: data.content });
      } catch {
        setPreviewError("Story not found. Check the link and try again.");
      } finally {
        setPreviewLoading(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input]);

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    try {
      const res = await fetch("/api/stories/save-shared", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: preview.id }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setSavedId(data.id);
      onAdded();
    } catch {
      setPreviewError("Something went wrong saving the story. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/50">
          <div>
            <h2 className="text-xl font-serif font-bold text-foreground">Add from link</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Paste a share link to save a story to your library</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted/70 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Input */}
          <div className="relative">
            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Paste share link here…"
              value={input}
              onChange={e => { setInput(e.target.value); setSavedId(null); }}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
          </div>

          {/* States */}
          {previewLoading && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50 border border-border/50">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin shrink-0" />
              <span className="text-sm text-muted-foreground">Looking up story…</span>
            </div>
          )}

          {previewError && !previewLoading && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <span className="text-sm text-destructive">{previewError}</span>
            </div>
          )}

          {preview && !previewLoading && !savedId && (
            <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20 space-y-1">
              <div className="inline-block px-2.5 py-0.5 bg-accent/20 text-accent-foreground text-xs font-bold rounded-full mb-1">
                {preview.theme}
              </div>
              <p className="font-serif font-bold text-foreground leading-snug">{preview.title}</p>
              <p className="text-sm text-muted-foreground">For {preview.childName}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 pt-1">{preview.content}</p>
            </div>
          )}

          {savedId && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
              <Check className="w-5 h-5 text-green-600 shrink-0" />
              <span className="text-sm text-green-700 font-medium flex-1">Story added to your library!</span>
              <button
                onClick={() => { onClose(); navigate(`/stories/${savedId}`); }}
                className="text-xs font-bold text-primary hover:underline"
              >
                Open →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border bg-muted/50 hover:bg-muted text-sm font-bold transition-all"
          >
            {savedId ? "Done" : "Cancel"}
          </button>
          {!savedId && (
            <button
              onClick={handleSave}
              disabled={!preview || saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <><BookPlus className="w-4 h-4" /> Add to My Library</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
