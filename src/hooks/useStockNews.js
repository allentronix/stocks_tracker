import { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet } from '../config/api';

const CACHE_KEY = 'stockNews_cache';
const CACHE_TIMESTAMP_KEY = 'stockNews_cache_timestamp';
const CACHE_TTL_MS = 7200000; // 2 hours cache for news articles
const POLL_INTERVAL_MS = 7200000; // 2 hours between fetches

/**
 * Custom hook to fetch stock market news from NewsAPI
 * Implements aggressive caching to stay within 100 calls/day limit
 *
 * Strategy:
 * - Fetch once on mount (if cache expired)
 * - Cache for 2 hours
 * - Only fetch general market news (1 API call instead of 10)
 * - This results in ~12 calls per day (24 hours / 2 hours)
 *
 * @returns {Object} News data with articles array, loading, and error states
 */
export function useStockNews() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pollingIntervalRef = useRef(null);
  const isFetchingRef = useRef(false);

  /**
   * Load cached news articles from localStorage
   */
  const loadCachedNews = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cached && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp, 10);

        // Use cache if less than 2 hours old
        if (cacheAge < CACHE_TTL_MS) {
          const newsData = JSON.parse(cached);
          console.log('[News] Using cached data', {
            cacheAge: Math.floor(cacheAge / 1000 / 60) + ' minutes',
            articleCount: newsData.length,
          });
          return newsData;
        } else {
          console.log('[News] Cache expired', {
            cacheAge: Math.floor(cacheAge / 1000 / 60) + ' minutes',
          });
        }
      }
    } catch (error) {
      console.error('[News] Error loading cache:', error);
    }
    return null;
  }, []);

  /**
   * Save news articles to localStorage
   */
  const saveNewsToCache = useCallback((newsData) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(newsData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('[News] Saved to cache', { articleCount: newsData.length });
    } catch (error) {
      console.error('[News] Error saving to cache:', error);
    }
  }, []);

  /**
   * Fetch news from NewsAPI
   * Uses 'everything' endpoint with stock market query
   * This is 1 API call instead of 10 (one per stock)
   */
  const fetchNews = useCallback(async () => {
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);

    try {
      // Fetch general stock market news through the API gateway (1 API call).
      // NewsAPI blocks direct browser requests outside localhost, and the
      // gateway keeps the key private and filters/formats the articles.
      console.log('[News] Fetching from API...');
      const data = await apiGet('news');
      const formattedArticles = Array.isArray(data?.articles) ? data.articles : [];

      setArticles(formattedArticles);
      saveNewsToCache(formattedArticles);
      setError(null);

      console.log('[News] Successfully fetched', {
        returned: formattedArticles.length,
      });

    } catch (err) {
      console.error('[News] Fetch error:', err.message);
      setError(err.message);

      // Try to use cached data on error
      const cachedNews = loadCachedNews();
      if (cachedNews && cachedNews.length > 0) {
        setArticles(cachedNews);
        console.log('[News] Using cached data after error');
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [loadCachedNews, saveNewsToCache]);

  /**
   * Check if we should fetch (respects cache TTL)
   */
  const shouldFetch = useCallback(() => {
    try {
      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (!cacheTimestamp) return true;

      const timeSinceLastFetch = Date.now() - parseInt(cacheTimestamp, 10);
      const shouldFetchNow = timeSinceLastFetch >= CACHE_TTL_MS;

      console.log('[News] Should fetch check:', {
        timeSinceLast: Math.floor(timeSinceLastFetch / 1000 / 60) + ' minutes',
        shouldFetch: shouldFetchNow,
      });

      return shouldFetchNow;
    } catch (error) {
      console.error('[News] Error checking fetch condition:', error);
      return true;
    }
  }, []);

  // Set up caching and polling
  useEffect(() => {
    // Load cached data immediately
    const cachedNews = loadCachedNews();
    if (cachedNews && cachedNews.length > 0) {
      setArticles(cachedNews);
      setLoading(false);
    }

    // Check if we should fetch new data
    if (shouldFetch()) {
      fetchNews();
    } else {
      setLoading(false);
    }

    // Set up polling interval (every 2 hours)
    pollingIntervalRef.current = setInterval(() => {
      if (shouldFetch()) {
        fetchNews();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchNews, loadCachedNews, shouldFetch]);

  return {
    articles,
    loading,
    error,
    refetch: fetchNews, // Manual refresh function
  };
}
