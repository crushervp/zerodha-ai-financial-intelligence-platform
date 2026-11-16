/**
 * Resolves the backend API base URL dynamically at runtime:
 * - If NEXT_PUBLIC_API_BASE is explicitly set, use it.
 * - When running directly on port 3000 during local dev without a reverse proxy, target backend on port 8000.
 * - In production (behind Nginx on AWS EC2, custom domains, or port 80/443), returns ""
 *   so all API calls use relative paths (/api/...) on the same origin without CORS or network errors.
 */
export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_BASE !== undefined && process.env.NEXT_PUBLIC_API_BASE !== '') {
    return process.env.NEXT_PUBLIC_API_BASE;
  }
  if (typeof window !== 'undefined') {
    if (window.location.port === '3000') {
      return `http://${window.location.hostname}:8000`;
    }
    return '';
  }
  return '';
}

export const API_BASE = getApiBase();
