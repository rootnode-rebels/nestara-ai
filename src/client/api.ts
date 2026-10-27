// In-memory token storage to avoid exposing tokens to XSS via localStorage (SEC-04)
let inMemoryToken: string | null = null;

// Clean up any legacy tokens previously persisted in localStorage
try {
  localStorage.removeItem("nestara_token");
} catch {
  // Ignore in sandboxed / non-browser environments
}

export function getStoredToken(): string | null {
  return inMemoryToken;
}

export function setStoredToken(token: string | null): void {
  inMemoryToken = token;
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const opts: RequestInit = {
    method,
    headers,
    credentials: "same-origin",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(path, opts);
  let data: unknown = null;
  try {
    data = await r.json();
  } catch {
    /* empty body */
  }
  if (!r.ok) {
    const msg = (data as { error?: string } | null)?.error || `${r.status} ${r.statusText}`;
    throw new Error(msg);
  }
  return data as T;
}
