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

export const MUSIC_STORAGE_KEY = "sion:music";

export function MusicProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<MusicVideo | null>(null);
  const [queue, setQueue] = useState<MusicVideo[]>([]);

  // Persist to localStorage whenever the playing song changes.
  useEffect(() => {
    try {
      if (current) {
        localStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify({ current, queue }));
      } else {
        localStorage.removeItem(MUSIC_STORAGE_KEY);
      }
    } catch {}
  }, [current, queue]);

  function play(video: MusicVideo, newQueue?: MusicVideo[]) {
    setCurrent(video);
    if (newQueue && newQueue.length > 0) setQueue(newQueue);
  }

  function stop() {
    setCurrent(null);
    setQueue([]);
    try { localStorage.removeItem(MUSIC_STORAGE_KEY); } catch {}
  }

  return (
    <MusicContext.Provider value={{ current, queue, play, stop }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
