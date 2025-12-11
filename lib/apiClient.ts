import { auth } from "./firebaseClient";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

async function withAuth(path: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res;
}

// JSON helper
export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await withAuth(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res.json() as Promise<T>;
}

// Raw helper for non-JSON requests (e.g. file uploads, CSV export)
export async function apiFetchRaw(path: string, options: RequestInit = {}) {
  return withAuth(path, options);
}

