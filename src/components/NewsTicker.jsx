import { useStockNews } from "../hooks/useStockNews";
import "../styles/NewsTicker.css";

export default function NewsTicker() {
  const { articles, loading, error } = useStockNews();

  if (loading && articles.length === 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/10">
        <div className="h-10 sm:h-12 flex items-center px-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-white/60 text-xs sm:text-sm">Loading news...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && articles.length === 0) {
    return null; // Hide ticker if there's an error and no cached data
  }

  if (articles.length === 0) {
    return null; // Hide ticker if no articles
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/10 overflow-hidden">
      <div className="h-10 sm:h-12 flex items-center">
        {/* News Badge - Hidden on very small screens */}
        <div className="hidden xs:flex flex-shrink-0 px-3 sm:px-6 border-r border-white/10">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-white font-semibold text-xs sm:text-sm uppercase tracking-wide">
              <span className="hidden sm:inline">Live News</span>
              <span className="sm:hidden">News</span>
            </span>
          </div>
        </div>

        {/* Scrolling News Container */}
        <div className="flex-1 relative overflow-hidden">
          <div className="news-ticker-track">
            {/* Duplicate articles for seamless loop */}
            {[...articles, ...articles].map((article, index) => (
              <a
                key={`${article.url}-${index}`}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="news-ticker-item group"
              >
                <span className="text-white/90 group-hover:text-blue-400 transition-colors font-medium text-xs sm:text-sm">
                  {article.title}
                </span>
                <span className="text-white/40 text-xs sm:text-sm ml-1.5 sm:ml-2 hidden sm:inline">
                  — {article.source}
                </span>
                <span className="text-white/20 mx-2 sm:mx-4 text-xs sm:text-sm">•</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Gradient Overlays for Fade Effect - Smaller on mobile */}
      <div className="absolute top-0 left-0 h-full w-16 sm:w-32 bg-gradient-to-r from-black/80 to-transparent pointer-events-none"></div>
      <div className="absolute top-0 right-0 h-full w-16 sm:w-32 bg-gradient-to-l from-black/80 to-transparent pointer-events-none"></div>
    </div>
  );
}
