/**
 * API client for ThoughtBox backend.
 *
 * API_BASE is resolved at build time from the VITE_API_URL env variable.
 * In Docker, this should point to the backend's public URL (e.g. http://localhost:8000).
 * Falls back to http://localhost:8000 for local development.
 */

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

export interface Thought {
  id: number;
  content: string;
  category: string;
  likes: number;
  created_at: string;
}

export interface ThoughtAdmin {
  id: number;
  content: string;
  category: string;
  likes: number;
  reports: number;
  is_approved: boolean;
  is_hidden: boolean;
  created_at: string;
}

export interface Report {
  id: number;
  thought_id: number;
  reason: string | null;
  created_at: string;
}

export const CATEGORIES = [
  'Academics',
  'Suggestions',
  'Appreciation',
  'Campus Life',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

// --- Public API ---

export async function fetchThoughts(category?: string): Promise<Thought[]> {
  const url = category
    ? `${API_BASE}/api/thoughts?category=${encodeURIComponent(category)}`
    : `${API_BASE}/api/thoughts`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch thoughts');
  return res.json();
}

export async function createThought(content: string, category: string): Promise<Thought> {
  const res = await fetch(`${API_BASE}/api/thoughts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, category }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || 'Failed to create thought');
  }
  return res.json();
}

export async function likeThought(id: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/thoughts/${id}/like`, { method: 'POST' });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || 'Failed to like thought');
  }
  return res.json();
}

export async function reportThought(id: number, reason?: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/thoughts/${id}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason || null }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || 'Failed to report thought');
  }
  return res.json();
}

// --- Moderator API ---

export async function modGetThoughts(secret: string): Promise<ThoughtAdmin[]> {
  const res = await fetch(`${API_BASE}/api/mod/thoughts`, {
    headers: { 'X-Moderator-Secret': secret },
  });
  if (!res.ok) throw new Error(res.status === 403 ? 'Invalid moderator credentials' : 'Failed to fetch');
  return res.json();
}

export async function modGetReports(secret: string): Promise<Report[]> {
  const res = await fetch(`${API_BASE}/api/mod/reports`, {
    headers: { 'X-Moderator-Secret': secret },
  });
  if (!res.ok) throw new Error(res.status === 403 ? 'Invalid moderator credentials' : 'Failed to fetch');
  return res.json();
}

export async function modHideThought(id: number, secret: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/mod/thoughts/${id}/hide`, {
    method: 'POST',
    headers: { 'X-Moderator-Secret': secret },
  });
  if (!res.ok) throw new Error('Failed to hide thought');
  return res.json();
}

export async function modUnhideThought(id: number, secret: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/mod/thoughts/${id}/unhide`, {
    method: 'POST',
    headers: { 'X-Moderator-Secret': secret },
  });
  if (!res.ok) throw new Error('Failed to unhide thought');
  return res.json();
}

export async function checkHealth(): Promise<{ status: string; database: string }> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('Backend unavailable');
  return res.json();
}
