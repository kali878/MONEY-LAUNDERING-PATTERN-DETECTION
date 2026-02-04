// Centralized API base URL resolution
// Priority:
// 1) VITE_API_URL from environment (Vercel/local .env)
// 2) Runtime override via window.__ANUP-SECURITY-PORTAL_API_BASE (for debugging)
// 3) If localhost -> default to local backend http://localhost:5001/api
// 4) Else same-origin '/api' (for reverse-proxied deployments)
const ENV_BASE = (import.meta.env?.VITE_API_URL || "").trim();
const RUNTIME_OVERRIDE = (
  typeof window !== "undefined" && window.__ANUP_SECURITY_PORTAL_API_BASE
    ? String(window.__ANUP_SECURITY_PORTAL_API_BASE)
    : ""
).trim();

let derived = ENV_BASE || RUNTIME_OVERRIDE;

if (!derived && typeof window !== "undefined") {
  const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
  if (isLocal) {
    derived = "http://localhost:5001/api";
  } else {
    // Fallback to same-origin '/api' if running behind a proxy
    derived = `${window.location.origin}/api`;
  }
}

derived = derived.replace(/\/$/, "");
export const API_BASE = derived;
export function resolveApi(path = "") {
  return `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;
}
