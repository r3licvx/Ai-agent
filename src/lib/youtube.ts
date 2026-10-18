import { YOUTUBE_API_KEY } from "@/lib/constants";

export type YouTubeVideoDetails = {
  id: string;
  url: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  channelAvatarUrl: string;
  thumbnailUrl: string;
  duration: string;
  formattedDuration: string;
  views: string;
  formattedViews: string;
  likes: string;
  formattedLikes: string;
  publishedAt: string;
  formattedPublishedAt: string;
};

export type YouTubeChannelDetails = {
  id: string;
  key: string;
  title: string;
  customUrl: string;
  description: string;
  avatarUrl: string;
  subscriberCount: string;
  formattedSubscribers: string;
  videoCount: string;
  viewCount: string;
  formattedViews: string;
  url: string;
};

// Memory caches
const videoMemoryCache = new Map<string, YouTubeVideoDetails>();
const channelMemoryCache = new Map<string, YouTubeChannelDetails>();
const channelAvatarMemoryCache = new Map<string, string>();

// Extract video IDs from any string
export function extractYouTubeVideos(text: string): { url: string; videoId: string }[] {
  if (!text) return [];

  const regex =
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s<>"')]*)/gi;

  const results: { url: string; videoId: string }[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    let rawUrl = match[0];
    const videoId = match[1];

    rawUrl = rawUrl.replace(/[.,!?:;)"']+$/, "");

    if (videoId && !seen.has(videoId)) {
      seen.add(videoId);
      results.push({ url: rawUrl, videoId });
    }
  }

  return results;
}

// Extract channel handles or IDs from any string
export function extractYouTubeChannels(
  text: string,
): { rawUrl: string; key: string; isHandle: boolean }[] {
  if (!text) return [];

  // Match youtube.com/channel/UC... or youtube.com/@handle or youtube.com/c/name
  const regex =
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/(?:channel\/(UC[a-zA-Z0-9_-]{22})|@([a-zA-Z0-9_.-]+)|c\/([a-zA-Z0-9_.-]+)|user\/([a-zA-Z0-9_.-]+))(?:[^\s<>"')]*)/gi;

  const results: { rawUrl: string; key: string; isHandle: boolean }[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    let rawUrl = match[0];
    rawUrl = rawUrl.replace(/[.,!?:;)"']+$/, "");

    const channelId = match[1];
    const handle = match[2];
    const custom = match[3] || match[4];

    const key = channelId || handle || custom;
    if (key && !seen.has(key.toLowerCase())) {
      seen.add(key.toLowerCase());
      results.push({
        rawUrl,
        key,
        isHandle: !channelId,
      });
    }
  }

  return results;
}

export function isYouTubeVideoUrl(str: string): boolean {
  return /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i.test(
    str,
  );
}

export function getYouTubeVideoId(str: string): string | null {
  const match = str.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  );
  return match ? match[1] : null;
}

export function isYouTubeChannelUrl(str: string): boolean {
  return /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/(?:channel\/UC[a-zA-Z0-9_-]{22}|@[a-zA-Z0-9_.-]+|c\/[a-zA-Z0-9_.-]+)/i.test(
    str,
  );
}

export function getYouTubeChannelKey(str: string): { key: string; isHandle: boolean } | null {
  const match = str.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/(?:channel\/(UC[a-zA-Z0-9_-]{22})|@([a-zA-Z0-9_.-]+)|c\/([a-zA-Z0-9_.-]+))/i,
  );
  if (!match) return null;
  if (match[1]) return { key: match[1], isHandle: false };
  if (match[2]) return { key: match[2], isHandle: true };
  if (match[3]) return { key: match[3], isHandle: true };
  return null;
}

// Format ISO 8601 duration (e.g., PT3M34S -> 3:34, PT1H2M10S -> 1:02:10)
export function formatDuration(iso: string): string {
  if (!iso) return "";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return "";
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

// Format counts (e.g. 1827910140 -> 1.8B, 132000 -> 132K)
export function formatViews(countStr: string): string {
  const num = parseInt(countStr, 10);
  if (isNaN(num)) return countStr || "0";
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toLocaleString();
}

// Format date into human relative time or month year
export function formatPublishDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffYears = now.getFullYear() - date.getFullYear();
    if (diffYears > 1) return `${diffYears} years ago`;
    if (diffYears === 1) return `1 year ago`;

    const diffMonths =
      (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    if (diffMonths > 1) return `${diffMonths} months ago`;
    if (diffMonths === 1) return `1 month ago`;

    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) return `${diffDays} days ago`;
    if (diffDays === 1) return `Yesterday`;

    return "Recently";
  } catch {
    return "";
  }
}

// Fetch channel avatar helper
async function fetchChannelAvatars(channelIds: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const needed: string[] = [];

  for (const id of channelIds) {
    if (channelAvatarMemoryCache.has(id)) {
      result[id] = channelAvatarMemoryCache.get(id)!;
    } else {
      needed.push(id);
    }
  }

  if (needed.length === 0) return result;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${needed.join(",")}&key=${YOUTUBE_API_KEY}`,
    );
    if (res.ok) {
      const data = await res.json();
      const items = data.items || [];
      for (const item of items) {
        const avatar =
          item.snippet?.thumbnails?.default?.url || item.snippet?.thumbnails?.medium?.url || "";
        if (id && avatar) {
          channelAvatarMemoryCache.set(id, avatar);
          result[id] = avatar;
        }
      }
    }
  } catch {
    // ignore
  }

  return result;
}

// Fetch batch video details from YouTube Data API v3
export async function fetchYouTubeVideoDetails(
  videoIds: string[],
): Promise<Record<string, YouTubeVideoDetails>> {
  const output: Record<string, YouTubeVideoDetails> = {};
  const missingIds: string[] = [];

  for (const id of videoIds) {
    if (videoMemoryCache.has(id)) {
      output[id] = videoMemoryCache.get(id)!;
      continue;
    }
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`yt_v3_${id}`);
        if (stored) {
          const parsed = JSON.parse(stored) as YouTubeVideoDetails;
          videoMemoryCache.set(id, parsed);
          output[id] = parsed;
          continue;
        }
      } catch {
        // ignore cache errors
      }
    }
    missingIds.push(id);
  }

  if (missingIds.length === 0) {
    return output;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${missingIds.join(",")}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);

    if (res.ok) {
      const data = await res.json();
      const items = (data.items || []) as Array<{
        id: string;
        snippet?: {
          title?: string;
          description?: string;
          channelId?: string;
          channelTitle?: string;
          publishedAt?: string;
          thumbnails?: {
            maxres?: { url?: string };
            standard?: { url?: string };
            high?: { url?: string };
            medium?: { url?: string };
            default?: { url?: string };
          };
        };
        contentDetails?: {
          duration?: string;
        };
        statistics?: {
          viewCount?: string;
          likeCount?: string;
        };
      }>;

      // Collect all channel IDs to fetch avatars in one batch
      const channelIds = Array.from(
        new Set(items.map((i) => i.snippet?.channelId).filter(Boolean) as string[]),
      );
      const avatars = await fetchChannelAvatars(channelIds);

      for (const item of items) {
        const id = item.id;
        const snip = item.snippet || {};
        const stats = item.statistics || {};
        const content = item.contentDetails || {};

        const bestThumb =
          snip.thumbnails?.maxres?.url ||
          snip.thumbnails?.standard?.url ||
          snip.thumbnails?.high?.url ||
          snip.thumbnails?.medium?.url ||
          snip.thumbnails?.default?.url ||
          `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

        const channelAvatarUrl =
          (snip.channelId ? avatars[snip.channelId] : "") ||
          "https://i.ibb.co/vxr5gVst/1000254285-jpg.jpg";

        const details: YouTubeVideoDetails = {
          id,
          url: `https://www.youtube.com/watch?v=${id}`,
          title: snip.title || `YouTube Video`,
          description: snip.description || "",
          channelId: snip.channelId || "",
          channelTitle: snip.channelTitle || "YouTube Creator",
          channelUrl: snip.channelId
            ? `https://www.youtube.com/channel/${snip.channelId}`
            : `https://www.youtube.com/watch?v=${id}`,
          channelAvatarUrl,
          thumbnailUrl: bestThumb,
          duration: content.duration || "",
          formattedDuration: formatDuration(content.duration || ""),
          views: stats.viewCount || "0",
          formattedViews: formatViews(stats.viewCount || "0"),
          likes: stats.likeCount || "0",
          formattedLikes: formatViews(stats.likeCount || "0"),
          publishedAt: snip.publishedAt || "",
          formattedPublishedAt: formatPublishDate(snip.publishedAt || ""),
        };

        videoMemoryCache.set(id, details);
        output[id] = details;

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`yt_v3_${id}`, JSON.stringify(details));
          } catch {
            // storage full, ignore
          }
        }
      }
    }
  } catch (err) {
    console.warn("YouTube API fetch error:", err);
  }

  // Fallbacks
  for (const id of missingIds) {
    if (!output[id]) {
      const fallbackDetails: YouTubeVideoDetails = {
        id,
        url: `https://www.youtube.com/watch?v=${id}`,
        title: `YouTube Video`,
        description: "",
        channelId: "",
        channelTitle: "YouTube Creator",
        channelUrl: `https://www.youtube.com/watch?v=${id}`,
        channelAvatarUrl: "",
        thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        duration: "",
        formattedDuration: "",
        views: "",
        formattedViews: "",
        likes: "",
        formattedLikes: "",
        publishedAt: "",
        formattedPublishedAt: "",
      };
      output[id] = fallbackDetails;
    }
  }

  return output;
}

// Fetch YouTube Channel Details by ID or handle
export async function fetchYouTubeChannelDetails(
  channels: { key: string; isHandle: boolean }[],
): Promise<Record<string, YouTubeChannelDetails>> {
  const output: Record<string, YouTubeChannelDetails> = {};
  const missing: { key: string; isHandle: boolean }[] = [];

  for (const c of channels) {
    const cleanKey = c.key.toLowerCase();
    if (channelMemoryCache.has(cleanKey)) {
      output[cleanKey] = channelMemoryCache.get(cleanKey)!;
      continue;
    }
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`yt_ch_v3_${cleanKey}`);
        if (stored) {
          const parsed = JSON.parse(stored) as YouTubeChannelDetails;
          channelMemoryCache.set(cleanKey, parsed);
          output[cleanKey] = parsed;
          continue;
        }
      } catch {
        // ignore
      }
    }
    missing.push(c);
  }

  if (missing.length === 0) return output;

  for (const item of missing) {
    const cleanKey = item.key.toLowerCase();
    try {
      let queryUrl = "";
      if (item.isHandle) {
        // Strip leading @ if present
        const handleParam = item.key.replace(/^@/, "");
        queryUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(handleParam)}&key=${YOUTUBE_API_KEY}`;
      } else {
        queryUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${encodeURIComponent(item.key)}&key=${YOUTUBE_API_KEY}`;
      }

      const res = await fetch(queryUrl);
      const data = res.ok ? await res.json() : null;
      let channelItem = data?.items?.[0];

      // If forHandle didn't find it, try search API
      if (!channelItem && item.isHandle) {
        const searchRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(item.key)}&key=${YOUTUBE_API_KEY}`,
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const foundChannelId = searchData.items?.[0]?.snippet?.channelId;
          if (foundChannelId) {
            const chRes = await fetch(
              `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${foundChannelId}&key=${YOUTUBE_API_KEY}`,
            );
            if (chRes.ok) {
              const chData = await chRes.json();
              channelItem = chData.items?.[0];
            }
          }
        }
      }

      if (channelItem) {
        const snip = channelItem.snippet || {};
        const stats = channelItem.statistics || {};

        const bestAvatar =
          snip.thumbnails?.high?.url ||
          snip.thumbnails?.medium?.url ||
          snip.thumbnails?.default?.url ||
          "";

        const channelUrl = snip.customUrl
          ? `https://www.youtube.com/${snip.customUrl}`
          : `https://www.youtube.com/channel/${channelItem.id}`;

        const details: YouTubeChannelDetails = {
          id: channelItem.id,
          key: cleanKey,
          title: snip.title || item.key,
          customUrl: snip.customUrl || (item.isHandle ? `@${item.key.replace(/^@/, "")}` : ""),
          description: snip.description || "",
          avatarUrl: bestAvatar,
          subscriberCount: stats.subscriberCount || "0",
          formattedSubscribers: formatViews(stats.subscriberCount || "0"),
          videoCount: stats.videoCount || "0",
          viewCount: stats.viewCount || "0",
          formattedViews: formatViews(stats.viewCount || "0"),
          url: channelUrl,
        };

        channelMemoryCache.set(cleanKey, details);
        output[cleanKey] = details;

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`yt_ch_v3_${cleanKey}`, JSON.stringify(details));
          } catch {
            // ignore
          }
        }
      } else {
        // Fallback for channel
        const fallback: YouTubeChannelDetails = {
          id: item.key,
          key: cleanKey,
          title: item.isHandle ? `@${item.key.replace(/^@/, "")}` : "YouTube Channel",
          customUrl: item.isHandle ? `@${item.key.replace(/^@/, "")}` : "",
          description: "",
          avatarUrl: "",
          subscriberCount: "",
          formattedSubscribers: "",
          videoCount: "",
          viewCount: "",
          formattedViews: "",
          url: item.isHandle
            ? `https://www.youtube.com/@${item.key.replace(/^@/, "")}`
            : `https://www.youtube.com/channel/${item.key}`,
        };
        channelMemoryCache.set(cleanKey, fallback);
        output[cleanKey] = fallback;
      }
    } catch (err) {
      console.warn("YouTube Channel fetch error:", err);
    }
  }

  return output;
}
