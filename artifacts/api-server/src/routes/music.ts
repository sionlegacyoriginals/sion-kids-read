import { Router } from "express";

const router = Router();

const CHANNEL_ID = "UCgNtVOshd55p2h6_-phDimA"; // @sionkidslife
const RSS_FEED   = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
// rss2json works around Replit's server IP being blocked by YouTube's RSS endpoint
const RSS2JSON   = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_FEED)}`;
const CACHE_TTL  = 6 * 60 * 60 * 1000; // 6 hours

interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

let cache: { videos: VideoItem[]; fetchedAt: number } | null = null;

async function fetchVideos(): Promise<VideoItem[]> {
  const res = await fetch(RSS2JSON, { headers: { "User-Agent": "SionKidsRead/1.0" } });
  if (!res.ok) throw new Error(`rss2json returned ${res.status}`);
  const data = await res.json() as {
    status: string;
    items: { title: string; link: string; pubDate: string; thumbnail?: string }[];
  };
  if (data.status !== "ok") throw new Error(`rss2json status: ${data.status}`);

  return data.items.map((item) => {
    // Extract video ID from YouTube watch URL or Shorts URL
    const idMatch = item.link.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ??
                    item.link.match(/shorts\/([a-zA-Z0-9_-]{11})/);
    const id = idMatch?.[1] ?? "";
    return {
      id,
      title: item.title,
      thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
      publishedAt: item.pubDate,
    };
  }).filter((v) => v.id !== "");
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
