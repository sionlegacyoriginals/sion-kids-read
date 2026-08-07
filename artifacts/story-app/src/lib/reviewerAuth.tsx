/**
 * Reviewer auth — parallel to Clerk, used for Google Play / App Store review accounts.
 * When active, a reviewer JWT is stored in localStorage and injected into every /api/ fetch
 * automatically so all existing pages work without modification.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

const STORAGE_KEY = "sion:reviewer_token";

interface ReviewerAuthContextValue {
  isReviewer: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const ReviewerAuthContext = createContext<ReviewerAuthContextValue>({
  isReviewer: false,
  token: null,
  login: () => {},
  logout: () => {},
});

function loadToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function ReviewerAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(loadToken);

  function login(t: string) {
    setToken(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  }

  function logout() {
    setToken(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  // Intercept window.fetch when a reviewer token is active so that every /api/
  // call automatically carries the Authorization header — no per-page changes needed.
  useEffect(() => {
    if (!token) return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = function reviewerFetch(input, init = {}) {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url;

      // Only inject for API calls; leave Clerk proxy and external calls alone.
      if (url.includes("/api/") && !url.includes("/clerk/")) {
        const headers = new Headers((init as RequestInit).headers ?? {});
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        return originalFetch(input, { ...(init as RequestInit), headers });
      }

      return originalFetch(input, init as RequestInit);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [token]);

  return (
    <ReviewerAuthContext.Provider
      value={{ isReviewer: !!token, token, login, logout }}
    >
      {children}
    </ReviewerAuthContext.Provider>
  );
}

export function useReviewerAuth() {
  return useContext(ReviewerAuthContext);
}
