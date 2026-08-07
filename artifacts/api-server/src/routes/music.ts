import { Router } from "express";

const router = Router();

const CHANNEL_ID = "UCgNtVOshd55p2h6_-phDimA"; // @sionkidslife
const RSS_FEED   = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
// rss2json works around Replit's server IP being blocked by YouTube's RSS endpoint
// _t param busts rss2json's own server-side cache so stale/deleted videos don't linger
const rss2jsonUrl = () =>
  `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_FEED)}&_t=${Date.now()}`;
const CACHE_TTL  = 10 * 60 * 1000; // 10 minutes — short enough to pick up new uploads quickly

interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  link: string;        // original YouTube URL, used to determine watch vs. Shorts link
  isShort: boolean;    // true when the video is a YouTube Short
}

let cache: { videos: VideoItem[]; fetchedAt: number } | null = null;

async function fetchVideos(): Promise<VideoItem[]> {
  const res = await fetch(rss2jsonUrl(), {
    headers: { "User-Agent": "SionKidsRead/1.0" },
    // No-cache so rss2json doesn't serve a stale copy either
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`rss2json returned ${res.status}`);
  const data = await res.json() as {
    status: string;
    items: { title: string; link: string; pubDate: string; thumbnail?: string }[];
  };
  if (data.status !== "ok") throw new Error(`rss2json status: ${data.status}`);

  return data.items.map((item) => {
    // Detect Shorts vs regular watch links
    const shortsMatch = item.link.match(/shorts\/([a-zA-Z0-9_-]{11})/);
    const watchMatch  = item.link.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    const isShort     = !!shortsMatch;
    const id          = (shortsMatch?.[1] ?? watchMatch?.[1]) ?? "";

    return {
      id,
      title: item.title,
      thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
      publishedAt: item.pubDate,
      link: item.link,
      isShort,
    };
  }).filter((v) => v.id !== "");
}

router.get("/music/videos", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "1" || req.query.refresh === "true";

    if (!forceRefresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
      res.setHeader("X-Cache", "HIT");
      return res.json({ videos: cache.videos });
    }

    const videos = await fetchVideos();
    cache = { videos, fetchedAt: Date.now() };
    res.setHeader("X-Cache", "MISS");
    res.json({ videos });
  } catch (err: any) {
    // Serve stale cache rather than an error if we have one
    if (cache) {
      res.setHeader("X-Cache", "STALE");
      return res.json({ videos: cache.videos });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
