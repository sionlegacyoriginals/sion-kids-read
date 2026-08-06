import { Router } from "express";

const router = Router();

const CHANNEL_ID = "UCgNtVOshd55p2h6_-phDimA"; // @sionkidslife
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

let cache: { videos: VideoItem[]; fetchedAt: number } | null = null;

async function fetchVideos(): Promise<VideoItem[]> {
  const res = await fetch(RSS_URL, {
    headers: { "User-Agent": "SionKidsRead/1.0" },
  });
  if (!res.ok) throw new Error(`YouTube RSS returned ${res.status}`);
  const xml = await res.text();

  const videos: VideoItem[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;

  while ((m = entryRe.exec(xml)) !== null) {
    const entry = m[1];
    const id    = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] ?? "";
    const title = entry.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    const pub   = entry.match(/<published>(.*?)<\/published>/)?.[1] ?? "";
    if (id) {
      videos.push({
        id,
        title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'),
        thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
        publishedAt: pub,
      });
    }
  }

  return videos;
}

router.get("/music/videos", async (_req, res) => {
  try {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
      return res.json({ videos: cache.videos });
    }
    const videos = await fetchVideos();
    cache = { videos, fetchedAt: Date.now() };
    res.json({ videos });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
