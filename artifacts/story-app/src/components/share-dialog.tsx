import { useState } from "react";
import { X, Copy, Check, Facebook, Twitter, Mail, MessageCircle } from "lucide-react";

interface ShareDialogProps {
  storyTitle: string;
  storyId: number;
  childName: string;
  onClose: () => void;
}

function buildShareUrl(storyId: number) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}/share/${storyId}`;
}

export function ShareDialog({ storyTitle, storyId, childName, onClose }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const url = buildShareUrl(storyId);
  const text = `✨ I just made a personalized bedtime story for ${childName} on Sion Legacy Originals! Check it out 📖`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    {
      label: "Facebook",
      icon: Facebook,
      color: "bg-[#1877F2] hover:bg-[#166FE5]",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
    },
    {
      label: "WhatsApp",
      icon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      color: "bg-[#25D366] hover:bg-[#20BD5A]",
      href: `https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`,
    },
    {
      label: "X (Twitter)",
      icon: Twitter,
      color: "bg-black hover:bg-zinc-800",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
      label: "Messenger",
      icon: MessageCircle,
      color: "bg-[#0084FF] hover:bg-[#006FD6]",
      href: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(url)}`,
    },
    {
      label: "Email",
      icon: Mail,
      color: "bg-zinc-600 hover:bg-zinc-700",
      href: `mailto:?subject=${encodeURIComponent(`A story for ${childName} 📖`)}&body=${encodeURIComponent(text + "\n\n" + url)}`,
    },
    {
      label: "SMS",
      icon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      ),
      color: "bg-green-600 hover:bg-green-700",
      href: `sms:?body=${encodeURIComponent(text + "\n" + url)}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/50">
          <div>
            <h2 className="text-xl font-serif font-bold text-foreground">Share this story</h2>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{storyTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted/70 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Share buttons */}
        <div className="p-6 grid grid-cols-3 gap-3">
          {shareOptions.map(({ label, icon: Icon, color, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl ${color} text-white transition-all hover:scale-105 active:scale-95`}
            >
              <Icon />
              <span className="text-xs font-semibold">{label}</span>
            </a>
          ))}
        </div>

        {/* Copy link */}
        <div className="px-6 pb-6">
          <div className="flex gap-2 p-3 bg-muted rounded-xl border border-border">
            <p className="flex-1 text-sm text-muted-foreground truncate">{url}</p>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-all shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
