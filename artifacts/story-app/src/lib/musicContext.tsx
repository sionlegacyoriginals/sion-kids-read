import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface MusicVideo {
  id: string;
  title: string;
  thumbnail: string;
}

interface MusicContextValue {
  current: MusicVideo | null;
  queue: MusicVideo[];
  /** True when the player was restored from storage and hasn't been tapped yet.
   *  The iframe is NOT rendered in this state — show a "resume" button instead. */
  isRestored: boolean;
  play: (video: MusicVideo, queue?: MusicVideo[]) => void;
  resume: () => void;
  stop: () => void;
}

const MusicContext = createContext<MusicContextValue>({
  current: null,
  queue: [],
  isRestored: false,
  play: () => {},
  resume: () => {},
  stop: () => {},
});

const STORAGE_KEY = "sion:music";

export function MusicProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<MusicVideo | null>(null);
  const [queue, setQueue] = useState<MusicVideo[]>([]);
  const [isRestored, setIsRestored] = useState(false);

  // Restore last-playing song from localStorage on first load.
  // Mark as "restored" so the mini player shows a resume button
  // instead of trying to autoplay (which browsers block after a refresh).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.current) {
          setCurrent(parsed.current);
          setQueue(parsed.queue ?? []);
          setIsRestored(true);
        }
      }
    } catch {}
  }, []);

  // Persist to localStorage whenever the playing song changes.
  useEffect(() => {
    try {
      if (current) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ current, queue }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, [current, queue]);

  function play(video: MusicVideo, newQueue?: MusicVideo[]) {
    setCurrent(video);
    setIsRestored(false);
    if (newQueue && newQueue.length > 0) setQueue(newQueue);
  }

  /** Called when the user taps the resume button — clears the restored flag
   *  so the iframe renders and autoplay is allowed (user just interacted). */
  function resume() {
    setIsRestored(false);
  }

  function stop() {
    setCurrent(null);
    setIsRestored(false);
  }

  // Pause music whenever the read-along player starts speaking.
  useEffect(() => {
    const handler = () => stop();
    window.addEventListener("sion:readalong-start", handler);
    return () => window.removeEventListener("sion:readalong-start", handler);
  }, []);

  return (
    <MusicContext.Provider value={{ current, queue, isRestored, play, resume, stop }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
