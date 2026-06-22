import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  Bookmark,
  Share2,
  ExternalLink,
} from "lucide-react";
import { usePawphileData } from "../context/PawphileDataContext";
import breedSeasonalRules, { FALLBACK_RULE } from "../data/breedSeasonalRules";
import { CARE_GUIDES } from "../data/careGuides";
import pawNewsArticles, { PawNewsArticle } from "../data/pawNews";
import SeasonalAlertCard from "../components/pawnews/SeasonalAlertCard";
import GuideGrid from "../components/pawnews/GuideGrid";

const PawNewsPage: React.FC = () => {
  const { dogProfile } = usePawphileData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [bookmarkedArticleIds, setBookmarkedArticleIds] = useState<Set<string>>(
    () => {
      const stored = localStorage.getItem("pawNews_bookmarks");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    },
  );
  const [selectedArticle, setSelectedArticle] = useState<PawNewsArticle | null>(
    null,
  );

  // Current season detection
  const currentMonth = new Date().getMonth() + 1;
  let seasonKey: "summer" | "monsoon" | "postMonsoon" | "winter" = "winter";
  let seasonLabel = "Winter";
  if (currentMonth >= 3 && currentMonth <= 5) {
    seasonKey = "summer";
    seasonLabel = "Summer Preparation";
  } else if (currentMonth >= 6 && currentMonth <= 9) {
    seasonKey = "monsoon";
    seasonLabel = "Monsoon";
  } else if (currentMonth >= 10 && currentMonth <= 11) {
    seasonKey = "postMonsoon";
    seasonLabel = "Post-Monsoon";
  }

  // Get seasonal alert for current dog
  const seasonalAlert = useMemo(() => {
    if (!dogProfile) return null;
    const breedRaw = dogProfile.breed || "";
    const breedKey = (breedRaw || "").toString().toLowerCase();
    const rule =
      breedSeasonalRules[breedKey] &&
      (breedSeasonalRules[breedKey] as any)[seasonKey]
        ? (breedSeasonalRules[breedKey] as any)[seasonKey]
        : FALLBACK_RULE;
    return rule;
  }, [dogProfile, seasonKey]);



  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    let filtered = [...pawNewsArticles];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.summary.toLowerCase().includes(query) ||
          article.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(
        (article) => article.category === selectedCategory,
      );
    }

    // Severity filter
    if (selectedSeverity) {
      filtered = filtered.filter(
        (article) => article.severity === selectedSeverity,
      );
    }

    // Sort by date (newest first), then by relevance
    filtered.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      if (dateA !== dateB) return dateB - dateA; // Newest first

      // Relevance: critical/warning severity first
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const severityA = severityOrder[a.severity as keyof typeof severityOrder];
      const severityB = severityOrder[b.severity as keyof typeof severityOrder];
      return severityA - severityB;
    });

    return filtered;
  }, [searchQuery, selectedCategory, selectedSeverity]);

  // Get unique categories from articles
  const categories = useMemo(() => {
    return Array.from(new Set(pawNewsArticles.map((a) => a.category))).sort();
  }, []);

  // Toggle bookmark
  const toggleBookmark = (articleId: string) => {
    const newBookmarks = new Set(bookmarkedArticleIds);
    if (newBookmarks.has(articleId)) {
      newBookmarks.delete(articleId);
    } else {
      newBookmarks.add(articleId);
    }
    setBookmarkedArticleIds(newBookmarks);
    localStorage.setItem(
      "pawNews_bookmarks",
      JSON.stringify(Array.from(newBookmarks)),
    );
  };

  // Share article
  const shareArticle = (article: PawNewsArticle) => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      const text = `${article.title}\n${article.summary}\n\nRead more in PAWPHILE`;
      navigator.clipboard.writeText(text);
      alert("Article info copied to clipboard!");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-l-red-500 bg-red-50 dark:bg-red-950/20";
      case "warning":
        return "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20";
      default:
        return "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20";
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
      case "warning":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
      default:
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
    }
  };

  return (
    <div className="min-h-full bg-white dark:bg-slate-950 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            📰 PAWPHILE News & Guides
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {dogProfile
              ? `Personalized preventive intelligence for ${dogProfile.name || "your dog"}`
              : "Latest veterinary insights and preventive care guides"}
          </p>
        </div>

        {/* Show empty state if no profile */}
        {!dogProfile && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
            <p className="text-blue-900 dark:text-blue-200">
              Complete your dog profile to get personalized seasonal alerts and
              breed-specific guidance.{" "}
              <a
                href="/profile"
                className="font-semibold underline hover:no-underline"
              >
                Go to Profile
              </a>
            </p>
          </div>
        )}

        {/* Seasonal Alerts Section */}
        {dogProfile && seasonalAlert && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              🌡️ {seasonLabel} Alert
            </h2>
            <SeasonalAlertCard
              alert={seasonalAlert}
              season={seasonLabel}
              breed={dogProfile.name || "Your Dog"}
            />
          </div>
        )}

        {/* Article Feed Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            📚 Health & Care Articles
          </h2>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search articles by title, topic, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Chips */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {/* Category filters */}
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === category ? null : category,
                    )
                  }
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? "bg-blue-500 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600"
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}

              {/* Severity filter */}
              <div className="pl-2 border-l border-slate-300 dark:border-slate-600 flex gap-2">
                {["critical", "warning", "info"].map((severity) => (
                  <button
                    key={severity}
                    onClick={() =>
                      setSelectedSeverity(
                        selectedSeverity === severity ? null : severity,
                      )
                    }
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedSeverity === severity
                        ? getSeverityBadgeColor(severity)
                        : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600"
                    }`}
                  >
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {(selectedCategory || selectedSeverity || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedSeverity(null);
                  setSearchQuery("");
                }}
                className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Articles Grid */}
          {filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className={`${getSeverityColor(article.severity)} border-l-4 rounded-lg p-5 cursor-pointer transition-transform hover:scale-105 hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {article.category}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(article.id);
                      }}
                      className="text-slate-600 dark:text-slate-400 hover:text-yellow-500 transition-colors"
                    >
                      <Bookmark
                        className="w-5 h-5"
                        fill={
                          bookmarkedArticleIds.has(article.id)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 line-clamp-2">
                    {article.summary}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span
                      className={`text-xs px-2 py-1 rounded ${getSeverityBadgeColor(article.severity)}`}
                    >
                      {article.severity}
                    </span>
                    {article.breeds && article.breeds.length > 0 && (
                      <span className="text-xs px-2 py-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        {article.breeds[0]}
                      </span>
                    )}
                    {article.seasons && article.seasons.length > 0 && (
                      <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        {article.seasons[0]}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>{article.readTimeMinutes} min read</span>
                    <span>
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-8 text-center">
              <p className="text-slate-600 dark:text-slate-400">
                No articles match your filters. Try adjusting your search.
              </p>
            </div>
          )}
        </div>

        {/* Essential Care Guides Section (from Phase 4) */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            📋 Essential Care Guides
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Trusted veterinary resources from WSAVA, AAHA, and other leading
            organizations
          </p>
          <GuideGrid guides={CARE_GUIDES} />
        </div>
      </div>

      {/* Article Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div
              className={`${getSeverityColor(selectedArticle.severity)} border-l-4 p-6 flex items-start justify-between`}
            >
              <div className="flex-1">
                <div className="flex gap-2 mb-3">
                  <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {selectedArticle.category}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${getSeverityBadgeColor(selectedArticle.severity)}`}
                  >
                    {selectedArticle.severity}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedArticle.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="flex gap-3 mb-4 text-sm text-slate-600 dark:text-slate-400">
                <span>{selectedArticle.source}</span>
                <span>•</span>
                <span>
                  {new Date(selectedArticle.publishedAt).toLocaleDateString()}
                </span>
                <span>•</span>
                <span>{selectedArticle.readTimeMinutes} min read</span>
              </div>

              {/* Article metadata */}
              <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                {selectedArticle.breeds &&
                  selectedArticle.breeds.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Breeds:{" "}
                      </span>
                      <span className="text-sm">
                        {selectedArticle.breeds.join(", ")}
                      </span>
                    </div>
                  )}
                {selectedArticle.seasons &&
                  selectedArticle.seasons.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Seasons:{" "}
                      </span>
                      <span className="text-sm">
                        {selectedArticle.seasons.join(", ")}
                      </span>
                    </div>
                  )}
              </div>

              {/* Article content */}
              <div className="prose dark:prose-invert max-w-none mb-6">
                {selectedArticle.content.split("\n").map((line, idx) => {
                  if (line.startsWith("#")) {
                    const level = line.match(/^#+/)?.[0].length || 1;
                    const text = line.replace(/^#+\s*/, "");
                    const headingClass =
                      level === 1
                        ? "text-2xl font-bold"
                        : level === 2
                          ? "text-xl font-bold"
                          : "text-lg font-semibold";
                    return (
                      <div
                        key={idx}
                        className={`${headingClass} text-slate-900 dark:text-white mt-4 mb-2`}
                      >
                        {text}
                      </div>
                    );
                  } else if (line.startsWith("- ")) {
                    return (
                      <div
                        key={idx}
                        className="text-slate-700 dark:text-slate-300 mb-1 ml-4"
                      >
                        • {line.slice(2)}
                      </div>
                    );
                  } else if (line.startsWith("| ")) {
                    // Simple table rendering
                    return (
                      <div
                        key={idx}
                        className="text-slate-700 dark:text-slate-300 font-mono text-sm mb-1"
                      >
                        {line}
                      </div>
                    );
                  } else if (line.trim()) {
                    return (
                      <div
                        key={idx}
                        className="text-slate-700 dark:text-slate-300 mb-3"
                      >
                        {line}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Disclaimer */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  ⓘ <strong>Educational Purposes:</strong> This information is
                  for educational purposes only. Always consult your
                  veterinarian for diagnosis and treatment recommendations.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => toggleBookmark(selectedArticle.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Bookmark
                    className="w-5 h-5"
                    fill={
                      bookmarkedArticleIds.has(selectedArticle.id)
                        ? "currentColor"
                        : "none"
                    }
                  />
                  {bookmarkedArticleIds.has(selectedArticle.id)
                    ? "Saved"
                    : "Save"}
                </button>
                <button
                  onClick={() => shareArticle(selectedArticle)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
                {selectedArticle.sourceUrl && (
                  <a
                    href={selectedArticle.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Read Original
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PawNewsPage;
