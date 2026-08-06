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

export function MusicProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<MusicVideo | null>(null);
  const [queue, setQueue] = useState<MusicVideo[]>([]);

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
