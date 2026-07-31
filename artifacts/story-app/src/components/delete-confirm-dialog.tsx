import { AlertTriangle } from "lucide-react";

interface DeleteConfirmDialogProps {
  storyTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export function DeleteConfirmDialog({ storyTitle, onConfirm, onCancel, isDeleting }: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Move to Recently Deleted?</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              "<span className="font-semibold text-foreground">{storyTitle}</span>" will be moved to Recently Deleted. You can restore it from the library within 30 days.
            </p>
          </div>
          <div className="flex gap-3 w-full pt-2">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 py-3 rounded-2xl border border-border bg-muted/50 text-foreground font-bold hover:bg-muted transition-all disabled:opacity-50"
            >
              Keep it
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-3 rounded-2xl bg-destructive text-white font-bold hover:bg-destructive/90 transition-all disabled:opacity-50"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
