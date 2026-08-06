import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface MusicVideo {
  id: string;
  title: string;
  thumbnail: string;
}

interface MusicContextValue {
  current: MusicVideo | null;
  queue: MusicVideo[];
  play: (video: MusicVideo, queue?: MusicVideo[]) => void;
  stop: () => void;
}

const MusicContext = createContext<MusicContextValue>({
  current: null,
  queue: [],
  play: () => {},
  stop: () => {},
});

const STORAGE_KEY = "sion:music";

export function MusicProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<MusicVideo | null>(null);
  const [queue, setQueue] = useState<MusicVideo[]>([]);

  // Restore last-playing song from localStorage on first load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.current) {
          setCurrent(parsed.current);
          setQueue(parsed.queue ?? []);
        }
      }
    } catch {}
  }, []);

  // Persist to localStorage whenever the playing song changes
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
    if (newQueue && newQueue.length > 0) setQueue(newQueue);
  }

  function stop() {
    setCurrent(null);
  }

  // Pause music whenever the read-along player starts speaking
  useEffect(() => {
    const handler = () => stop();
    window.addEventListener("sion:readalong-start", handler);
    return () => window.removeEventListener("sion:readalong-start", handler);
  }, []);

  return (
    <MusicContext.Provider value={{ current, queue, play, stop }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
