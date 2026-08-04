import { useState, useEffect } from "react";

const WATCHLIST_KEY = "stockWatchlist";
const STORAGE_EVENT = "watchlistUpdated";
export const MAX_WATCHLIST = 3;

// Helper function to get watchlist from localStorage
const getWatchlistFromStorage = () => {
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading watchlist:", error);
  }
  return [];
};

// Helper function to save watchlist to localStorage
const saveWatchlistToStorage = (watchlist) => {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: watchlist }));
  } catch (error) {
    console.error("Error saving watchlist:", error);
  }
};

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => getWatchlistFromStorage());

  // Listen for watchlist updates from other components
  useEffect(() => {
    const handleStorageUpdate = (event) => {
      if (event.detail) {
        setWatchlist(event.detail);
      } else {
        // Fallback: reload from localStorage
        setWatchlist(getWatchlistFromStorage());
      }
    };

    // Listen for custom events
    window.addEventListener(STORAGE_EVENT, handleStorageUpdate);
    
    // Also listen for storage events (for cross-tab sync)
    window.addEventListener("storage", () => {
      setWatchlist(getWatchlistFromStorage());
    });

    return () => {
      window.removeEventListener(STORAGE_EVENT, handleStorageUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  const addToWatchlist = (symbol) => {
    if (!symbol) return { ok: false, error: "Symbol required." };
    const upperSymbol = symbol.toUpperCase();
    const current = getWatchlistFromStorage();
    if (current.includes(upperSymbol)) {
      return { ok: true };
    }
    if (current.length >= MAX_WATCHLIST) {
      return {
        ok: false,
        error: `Watchlist is limited to ${MAX_WATCHLIST} symbols.`,
      };
    }
    const newWatchlist = [...current, upperSymbol];
    saveWatchlistToStorage(newWatchlist);
    setWatchlist(newWatchlist);
    return { ok: true };
  };

  const removeFromWatchlist = (symbol) => {
    if (!symbol) return;
    const upperSymbol = symbol.toUpperCase();
    setWatchlist((prev) => {
      const newWatchlist = prev.filter((s) => s !== upperSymbol);
      saveWatchlistToStorage(newWatchlist);
      return newWatchlist;
    });
  };

  const isInWatchlist = (symbol) => {
    if (!symbol) return false;
    return watchlist.includes(symbol.toUpperCase());
  };

  const toggleWatchlist = (symbol) => {
    if (!symbol) return { ok: false, error: "Symbol required." };
    const upperSymbol = symbol.toUpperCase();
    const current = getWatchlistFromStorage();
    if (current.includes(upperSymbol)) {
      removeFromWatchlist(upperSymbol);
      return { ok: true };
    }
    return addToWatchlist(upperSymbol);
  };

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    toggleWatchlist,
    MAX_WATCHLIST,
  };
}

