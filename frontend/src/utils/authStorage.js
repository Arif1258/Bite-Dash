/**
 * Centralized Auth Storage Utility
 * 
 * Provides tab-isolated authentication using `sessionStorage` as the primary store,
 * ensuring that different roles (Customer, Restaurant, Rider, Admin) can operate
 * independently in different tabs of the same browser without session clashing.
 * Falls back to `localStorage` for initial tab hydration.
 */

const TOKEN_KEY = "token";
const USER_KEY = "bitedash_user";

/**
 * Retrieves active auth token for current tab.
 * Checks sessionStorage first (tab-isolated), then falls back to localStorage.
 */
export const getAuthToken = () => {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

/**
 * Stores auth token and user for current tab and syncs with storage.
 */
export const setAuthToken = (token, user = null) => {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_KEY, token);
      if (user) {
        const userStr = typeof user === "string" ? user : JSON.stringify(user);
        sessionStorage.setItem(USER_KEY, userStr);
        localStorage.setItem(USER_KEY, userStr);
      }
    } else {
      clearAuthToken();
    }
  } catch (err) {
    console.warn("Error setting auth token:", err);
  }
};

/**
 * Clears auth token and user from current tab's sessionStorage and localStorage.
 */
export const clearAuthToken = () => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.warn("Error clearing auth token:", err);
  }
};

/**
 * Retrieves cached user for current tab.
 */
export const getCachedUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
