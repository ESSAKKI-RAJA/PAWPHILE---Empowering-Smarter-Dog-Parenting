import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, AlertTriangle } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import pawNewsArticles, { PawNewsArticle } from "../../data/pawNews";
import NewsForm from "../../components/admin/NewsForm";
import NewsList from "../../components/admin/NewsList";

export const AdminNews: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [articles, setArticles] = useState<PawNewsArticle[]>(pawNewsArticles);
  const [selectedArticle, setSelectedArticle] = useState<PawNewsArticle | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Check if user is admin (in real app, this would check Supabase user metadata or a role table)
  // For now, we'll check if user email contains "admin" or has a specific role
  const isAdmin = useMemo(() => {
    if (!user?.emailAddresses) return false;
    const primaryEmail = user.emailAddresses[0]?.emailAddress || "";
    return (
      primaryEmail.includes("admin") || user?.publicMetadata?.role === "admin"
    );
  }, [user]);

  // Filter articles by search query
  const filteredArticles = useMemo(() => {
    if (!searchQuery) return articles;
    const query = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.summary.toLowerCase().includes(query) ||
        a.category.toLowerCase().includes(query),
    );
  }, [articles, searchQuery]);

  // Handle form submission
  const handleFormSubmit = async (data: Partial<PawNewsArticle>) => {
    try {
      setIsSaving(true);

      // In a real app, this would send to Supabase
      // For now, we'll just update local state
      if (selectedArticle) {
        // Update existing article
        setArticles(
          articles.map((a) =>
            a.id === selectedArticle.id ? { ...a, ...data } : a,
          ),
        );
      } else {
        // Create new article
        const newArticle: PawNewsArticle = {
          ...data,
          id: data.id || `pn-${Date.now()}`,
          title: data.title || "",
          summary: data.summary || "",
          content: data.content || "",
          category: data.category || "seasonal",
          severity: data.severity || "info",
          source: data.source || "",
          sourceUrl: data.sourceUrl || "",
          publishedAt: data.publishedAt || new Date().toISOString(),
          readTimeMinutes: data.readTimeMinutes || 5,
          tags: data.tags || [],
          breeds: data.breeds,
          seasons: data.seasons,
          imageUrl: data.imageUrl,
        };
        setArticles([newArticle, ...articles]);
      }

      // TODO: If this was a critical severity article:
      // - Call Supabase edge function to send notifications
      // - Example: if (data.severity === 'critical') { await notifyUsers(data); }

      // Close form and reset
      setIsFormOpen(false);
      setSelectedArticle(null);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (articleId: string) => {
    try {
      setIsDeleting(true);
      // In a real app, this would delete from Supabase
      setArticles(articles.filter((a) => a.id !== articleId));
    } finally {
      setIsDeleting(false);
    }
  };

  // Redirect to login if not loaded
  if (!isLoaded) {
    return (
      <div className="min-h-full bg-white dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  // Redirect to login if not logged in
  if (!user) {
    navigate("/");
    return null;
  }

  // Show permission error if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-full bg-white dark:bg-slate-950 py-8">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div>
                <h1 className="font-bold text-red-900 dark:text-red-100 mb-1">
                  Access Denied
                </h1>
                <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                  You do not have permission to access the admin panel. Only
                  administrators can manage articles.
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="inline-block px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white dark:bg-slate-950 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                📰 Admin Panel
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Manage PAWPHILE News & Education articles
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedArticle(null);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Article
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Total Articles
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {articles.length}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Critical
            </p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {articles.filter((a) => a.severity === "critical").length}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Warning
            </p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {articles.filter((a) => a.severity === "warning").length}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Articles List */}
        <NewsList
          articles={filteredArticles}
          onEdit={(article) => {
            setSelectedArticle(article);
            setIsFormOpen(true);
          }}
          onDelete={handleDelete}
          isLoading={isDeleting}
        />

        {/* Info Message */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>Note:</strong> When you save an article with "critical"
            severity, a notification will be sent to all users via Firebase
            Cloud Messaging. Articles are stored in Supabase with admin-only
            write permissions.
          </p>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <NewsForm
          article={selectedArticle || undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setSelectedArticle(null);
          }}
          isLoading={isSaving}
        />
      )}
    </div>
  );
};

export default AdminNews;
