import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@sion_auth_token';

let _cachedToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (_cachedToken) return _cachedToken;
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string) {
  _cachedToken = token;
  return AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  _cachedToken = null;
  return AsyncStorage.removeItem(TOKEN_KEY);
}

export function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  // Fallback to production URL — relative paths don't work in React Native
  return 'https://sionkidsread.com/api';
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const extraHeaders = (options.headers ?? {}) as Record<string, string>;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(`${getApiBase()}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
}

// ── Story types ──────────────────────────────────────────────────────────────
export interface Story {
  id: number;
  childName: string;
  childAge: number;
  childGender: string;
  theme: string;
  title: string;
  content: string;
  coverImageUrl?: string | null;
  bibleVerse?: string | null;
  customPrompt?: string | null;
  milestones?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoryInput {
  childName: string;
  childAge: number;
  childGender: 'boy' | 'girl';
  theme: string;
  customPrompt?: string;
  bibleVerse?: string;
  milestones?: string;
}

// ── Music types ──────────────────────────────────────────────────────────────
export interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  link: string;      // original YouTube URL
  isShort: boolean;  // true when the video is a YouTube Short
}

// ── Story API ────────────────────────────────────────────────────────────────
export async function fetchStories(): Promise<Story[]> {
  const res = await apiFetch('/stories');
  if (!res.ok) throw new Error('Failed to load stories');
  return res.json();
}

export async function fetchRecentStories(): Promise<Story[]> {
  const res = await apiFetch('/stories/recent');
  if (!res.ok) throw new Error('Failed to load recent stories');
  return res.json();
}

export async function fetchStory(id: number): Promise<Story> {
  const res = await apiFetch(`/stories/${id}`);
  if (!res.ok) throw new Error('Story not found');
  return res.json();
}

export async function createStory(input: StoryInput): Promise<Story> {
  const res = await apiFetch('/stories', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error ?? 'Failed to create story');
  }
  return res.json();
}

export async function deleteStory(id: number): Promise<void> {
  await apiFetch(`/stories/${id}`, { method: 'DELETE' });
}

export async function updateStory(
  id: number,
  fields: { title?: string; content?: string },
): Promise<Story> {
  const res = await apiFetch(`/stories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as any).error ?? 'Failed to save changes');
  }
  return res.json();
}

// ── Music API ────────────────────────────────────────────────────────────────
export async function fetchMusicVideos(forceRefresh = false): Promise<VideoItem[]> {
  const path = forceRefresh ? '/music/videos?refresh=1' : '/music/videos';
  const res = await apiFetch(path);
  if (!res.ok) throw new Error('Failed to load music');
  const data = await res.json();
  return data.videos ?? [];
}
