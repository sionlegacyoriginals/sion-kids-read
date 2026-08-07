import { Router } from "express";

const router = Router();

const CHANNEL_ID = "UCgNtVOshd55p2h6_-phDimA"; // @sionkidslife
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  link: string;
  isShort: boolean;
}

let cache: { videos: VideoItem[]; fetchedAt: number } | null = null;

function parseYouTubeXml(xml: string): VideoItem[] {
  const entries: VideoItem[] = [];
  // Split on <entry> blocks
  const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g);
  for (const match of entryMatches) {
    const block = match[1];

    const idMatch     = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch  = block.match(/<title>([^<]+)<\/title>/);
    const pubMatch    = block.match(/<published>([^<]+)<\/published>/);
    const thumbMatch  = block.match(/<media:thumbnail\s+url="([^"]+)"/);
    const linkMatch   = block.match(/<link\s+rel="alternate"\s+href="([^"]+)"/);

    if (!idMatch || !titleMatch) continue;

    const id    = idMatch[1].trim();
    const title = titleMatch[1].trim()
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    const publishedAt = pubMatch?.[1]?.trim() ?? "";
    const link        = linkMatch?.[1]?.trim() ?? `https://www.youtube.com/watch?v=${id}`;
    const thumbnail   = thumbMatch?.[1]?.trim() ?? `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

    // Shorts are identified by their link URL
    const isShort = link.includes("/shorts/");

    entries.push({ id, title, thumbnail, publishedAt, link, isShort });
  }
  return entries;
}

async function fetchVideos(): Promise<VideoItem[]> {
  // Fetch directly from YouTube — no third-party proxy, no external cache
  const res = await fetch(`${RSS_URL}&_t=${Date.now()}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SionKidsRead/1.0)",
      "Accept": "application/xml, text/xml, */*",
    },
  });
  if (!res.ok) throw new Error(`YouTube RSS returned ${res.status}`);
  const xml = await res.text();
  const videos = parseYouTubeXml(xml);
  if (videos.length === 0) throw new Error("No videos parsed from feed");
  return videos;
}

router.get("/music/videos", async (req, res) => {
  try {
    const wantsRefresh = req.query.refresh === "1" || req.query.refresh === "true";

    if (!wantsRefresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
      res.setHeader("X-Cache", "HIT");
      return res.json({ videos: cache.videos });
    }

    const videos = await fetchVideos();
    cache = { videos, fetchedAt: Date.now() };
    res.setHeader("X-Cache", "MISS");
    res.json({ videos });
  } catch (err: any) {
    if (cache) {
      res.setHeader("X-Cache", "STALE");
      return res.json({ videos: cache.videos });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
