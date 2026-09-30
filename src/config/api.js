/** Base URL of the API gateway. Same origin by default (Netlify Function at /api/*). */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/** GET a JSON endpoint on the gateway, throwing on HTTP or API errors. */
export async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}/api/${path}`);
  let data = null;
  try {
    data = await response.json();
  } catch {
    // non-JSON body
  }
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data;
}
