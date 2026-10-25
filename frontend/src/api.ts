/**
 * API client for ThoughtBox backend.
 *
 * API_BASE is resolved at build time from the VITE_API_URL env variable.
 * In Docker, this should point to the backend's public URL (e.g. http://localhost:8000).
 * Falls back to http://localhost:8000 for local development.
 */

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

// --- Auth Storage Helpers ---
const TOKEN_KEY = 'thoughtbox_token';
const USER_KEY = 'thoughtbox_user';
const VOTER_TOKEN_KEY = 'thoughtbox_voter_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function getVoterToken(): string {
  try {
    let token = localStorage.getItem(VOTER_TOKEN_KEY);
    if (!token) {
      token = 'voter_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
      localStorage.setItem(VOTER_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return 'voter_fallback_' + Date.now();
  }
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// --- Interfaces ---

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  roll_number?: string | null;
  role: 'user' | 'admin';
  avatar: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
}

export interface Thought {
  id: number;
  content: string;
  category: string;
  likes: number;
  created_at: string;
  author_name?: string;
  is_anonymous?: boolean;
  comments_count?: number;
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
  author_name?: string;
  is_anonymous?: boolean;
  user_id?: number | null;
  comments_count?: number;
}

export interface Report {
  id: number;
  thought_id: number;
  reason: string | null;
  created_at: string;
  thought_content?: string;
  thought_category?: string;
}

export interface PollOption {
  id: number;
  text: string;
  votes_count: number;
  percentage: number;
}

export interface Poll {
  id: number;
  question: string;
  description?: string | null;
  category: string;
  author_name?: string;
  is_active: boolean;
  total_votes: number;
  created_at: string;
  options: PollOption[];
  user_voted_option_id?: number | null;
}

export interface Comment {
  id: number;
  thought_id: number;
  author_name: string;
  content: string;
  created_at: string;
}

export interface AdminStats {
  total_thoughts: number;
  active_thoughts: number;
  hidden_thoughts: number;
  reported_thoughts: number;
  total_reports: number;
  total_polls: number;
  active_polls: number;
  total_votes: number;
  total_users: number;
  admin_users: number;
  total_comments: number;
  category_breakdown: Record<string, number>;
}

export const CATEGORIES = [
  'Academics',
  'Suggestions',
  'Appreciation',
  'Campus Life',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

// ============================================================
// AUTH API
// ============================================================

export async function registerUser(data: {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  roll_number?: string;
  avatar?: string;
  role?: 'user' | 'admin';
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || 'Registration failed');
  }
  const result: AuthResponse = await res.json();
  setStoredToken(result.access_token);
  setStoredUser(result.user);
  return result;
}

export async function loginUser(credentials: {
  username_or_email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || 'Invalid username or password');
  }
  const result: AuthResponse = await res.json();
  setStoredToken(result.access_token);
  setStoredUser(result.user);
  return result;
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    setStoredToken(null);
    setStoredUser(null);
    throw new Error('Not authenticated');
  }
  const user = await res.json();
  setStoredUser(user);
  return user;
}

export function logoutUser() {
  setStoredToken(null);
  setStoredUser(null);
}

// ============================================================
// PUBLIC THOUGHTS API
// ============================================================

export async function fetchThoughts(category?: string): Promise<Thought[]> {
  const url = category && category !== 'All'
    ? `${API_BASE}/api/thoughts?category=${encodeURIComponent(category)}`
    : `${API_BASE}/api/thoughts`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch thoughts');
  return res.json();
}

export async function createThought(
  content: string,
  category: string,
  isAnonymous: boolean = true
): Promise<Thought> {
  const res = await fetch(`${API_BASE}/api/thoughts`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ content, category, is_anonymous: isAnonymous }),
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

// ============================================================
// COMMENTS API
// ============================================================

export async function fetchComments(thoughtId: number): Promise<Comment[]> {
  const res = await fetch(`${API_BASE}/api/thoughts/${thoughtId}/comments`);
  if (!res.ok) throw new Error('Failed to fetch comments');
  return res.json();
}

export async function createComment(
  thoughtId: number,
  content: string,
  authorName?: string
): Promise<Comment> {
  const res = await fetch(`${API_BASE}/api/thoughts/${thoughtId}/comments`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ content, author_name: authorName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || 'Failed to post comment');
  }
  return res.json();
}

// ============================================================
// POLLS API
// ============================================================

export async function fetchPolls(category?: string): Promise<Poll[]> {
  const voterToken = getVoterToken();
  const params = new URLSearchParams();
  if (category && category !== 'All') params.append('category', category);
  params.append('voter_token', voterToken);

  const res = await fetch(`${API_BASE}/api/polls?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch polls');
  return res.json();
}

export async function createPoll(data: {
  question: string;
  description?: string;
  category: string;
  options: string[];
  is_anonymous?: boolean;
}): Promise<Poll> {
  const res = await fetch(`${API_BASE}/api/polls`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || 'Failed to create poll');
  }
  return res.json();
}

export async function votePoll(pollId: number, optionId: number): Promise<Poll> {
  const voterToken = getVoterToken();
  const res = await fetch(`${API_BASE}/api/polls/${pollId}/vote`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ option_id: optionId, voter_token: voterToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || 'Failed to submit vote');
  }
  return res.json();
}

// ============================================================
// ADMIN DASHBOARD API (Supports Bearer token or Moderator secret)
// ============================================================

function buildAdminHeaders(authKey?: string, extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (authKey) {
    // If authKey is secret string
    if (authKey.startsWith('Bearer ')) {
      headers['Authorization'] = authKey;
    } else {
      headers['X-Moderator-Secret'] = authKey;
    }
  } else {
    const token = getStoredToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function adminGetStats(authKey?: string): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/api/admin/stats`, {
    headers: buildAdminHeaders(authKey),
  });
  if (!res.ok) throw new Error(res.status === 403 ? 'Access denied: Admin credentials required' : 'Failed to fetch stats');
  return res.json();
}

export async function adminGetThoughts(
  authKey?: string,
  params?: { status?: string; category?: string; search?: string }
): Promise<ThoughtAdmin[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'all') query.append('status', params.status);
  if (params?.category && params.category !== 'All') query.append('category', params.category);
  if (params?.search) query.append('search', params.search);

  const url = `${API_BASE}/api/admin/thoughts?${query.toString()}`;
  const res = await fetch(url, { headers: buildAdminHeaders(authKey) });
  if (!res.ok) throw new Error(res.status === 403 ? 'Invalid admin credentials' : 'Failed to fetch thoughts');
  return res.json();
}

export async function adminEditThought(
  id: number,
  data: { content?: string; category?: string; is_hidden?: boolean; is_approved?: boolean },
  authKey?: string
): Promise<ThoughtAdmin> {
  const res = await fetch(`${API_BASE}/api/admin/thoughts/${id}`, {
    method: 'PUT',
    headers: buildAdminHeaders(authKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || 'Failed to edit thought');
  }
  return res.json();
}

export async function adminDeleteThought(id: number, authKey?: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/admin/thoughts/${id}`, {
    method: 'DELETE',
    headers: buildAdminHeaders(authKey),
  });
  if (!res.ok) throw new Error('Failed to delete thought');
  return res.json();
}

export async function adminClearReports(id: number, authKey?: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/admin/thoughts/${id}/reports`, {
    method: 'DELETE',
    headers: buildAdminHeaders(authKey),
  });
  if (!res.ok) throw new Error('Failed to clear reports');
  return res.json();
}

export async function adminGetReports(authKey?: string): Promise<Report[]> {
  const res = await fetch(`${API_BASE}/api/admin/reports`, {
    headers: buildAdminHeaders(authKey),
  });
  if (!res.ok) throw new Error(res.status === 403 ? 'Invalid admin credentials' : 'Failed to fetch reports');
  return res.json();
}

export async function adminDismissReport(reportId: number, authKey?: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/admin/reports/${reportId}`, {
    method: 'DELETE',
    headers: buildAdminHeaders(authKey),
  });
  if (!res.ok) throw new Error('Failed to dismiss report');
  return res.json();
}

export async function adminGetPolls(authKey?: string): Promise<Poll[]> {
  const res = await fetch(`${API_BASE}/api/admin/polls`, {
    headers: buildAdminHeaders(authKey),
  });
  if (!res.ok) throw new Error('Failed to fetch admin polls');
  return res.json();
}

export async function adminUpdatePoll(
  id: number,
  data: { question?: string; description?: string; category?: string; is_active?: boolean },
  authKey?: string
): Promise<Poll> {
  const res = await fetch(`${API_BASE}/api/admin/polls/${id}`, {
    method: 'PUT',
    headers: buildAdminHeaders(authKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update poll');
  return res.json();
}

export async function adminDeletePoll(id: number, authKey?: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/admin/polls/${id}`, {
    method: 'DELETE',
    headers: buildAdminHeaders(authKey),
  });
  if (!res.ok) throw new Error('Failed to delete poll');
  return res.json();
}

export async function adminGetUsers(authKey?: string): Promise<User[]> {
  const res = await fetch(`${API_BASE}/api/admin/users`, {
    headers: buildAdminHeaders(authKey),
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function adminUpdateUserRole(id: number, role: 'user' | 'admin', authKey?: string): Promise<User> {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}/role`, {
    method: 'PATCH',
    headers: buildAdminHeaders(authKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error('Failed to update user role');
  return res.json();
}

export async function adminUpdateUserStatus(id: number, isActive: boolean, authKey?: string): Promise<User> {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}/status`, {
    method: 'PATCH',
    headers: buildAdminHeaders(authKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!res.ok) throw new Error('Failed to update user status');
  return res.json();
}

export async function adminDeleteUser(id: number, authKey?: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
    method: 'DELETE',
    headers: buildAdminHeaders(authKey),
  });
  if (!res.ok) throw new Error('Failed to delete user');
  return res.json();
}

// --- Backward-Compatible Moderator Helpers ---
export async function modGetThoughts(secret: string): Promise<ThoughtAdmin[]> {
  return adminGetThoughts(secret);
}

export async function modGetReports(secret: string): Promise<Report[]> {
  return adminGetReports(secret);
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
