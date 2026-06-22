import React from "react";
import { Edit2, Trash2, ExternalLink } from "lucide-react";
import { PawNewsArticle } from "../../data/pawNews";

interface NewsListProps {
  articles: PawNewsArticle[];
  onEdit: (article: PawNewsArticle) => void;
  onDelete: (articleId: string) => Promise<void>;
  isLoading?: boolean;
}

export const NewsList: React.FC<NewsListProps> = ({
  articles,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this article? This cannot be undone.",
      )
    ) {
      try {
        setDeletingId(id);
        await onDelete(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200";
      case "warning":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200";
      default:
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200";
    }
  };

  if (articles.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-8 text-center">
        <p className="text-slate-600 dark:text-slate-400">
          No articles yet. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full">
        <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white">
              Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white">
              Severity
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 dark:text-white">
              Published
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-900 dark:text-white">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {articles.map((article) => (
            <tr
              key={article.id}
              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <td className="px-4 py-3">
                <div className="max-w-xs">
                  <p className="font-medium text-slate-900 dark:text-white truncate">
                    {article.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                    {article.summary}
                  </p>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {article.category.charAt(0).toUpperCase() +
                    article.category.slice(1)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${getSeverityColor(article.severity)}`}
                >
                  {article.severity.charAt(0).toUpperCase() +
                    article.severity.slice(1)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                {new Date(article.publishedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-2">
                  {article.sourceUrl && (
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      title="View original source"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => onEdit(article)}
                    disabled={isLoading || deletingId === article.id}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
                    title="Edit article"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(article.id)}
                    disabled={isLoading || deletingId !== null}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Delete article"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default NewsList;
