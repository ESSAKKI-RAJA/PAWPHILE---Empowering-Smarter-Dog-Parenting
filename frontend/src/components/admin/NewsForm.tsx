import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import {
  PawNewsArticle,
  ArticleCategory,
  ArticleSeverity,
  Season,
} from "../../data/pawNews";

interface NewsFormProps {
  article?: PawNewsArticle;
  onSubmit: (article: Partial<PawNewsArticle>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const CATEGORIES: ArticleCategory[] = [
  "seasonal",
  "breed",
  "symptom",
  "nutrition",
  "recall",
  "preventive",
  "emergency",
  "product",
];
const SEVERITIES: ArticleSeverity[] = ["info", "warning", "critical"];
const SEASONS: Season[] = [
  "spring",
  "summer",
  "monsoon",
  "winter",
  "postMonsoon",
];
const COMMON_BREEDS = [
  "labrador retriever",
  "german shepherd",
  "golden retriever",
  "pug",
  "beagle",
  "husky",
  "shih tzu",
];

export const NewsForm: React.FC<NewsFormProps> = ({
  article,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<Partial<PawNewsArticle>>(
    article || {
      title: "",
      summary: "",
      content: "",
      category: "seasonal",
      severity: "info",
      source: "",
      sourceUrl: "",
      imageUrl: "",
      readTimeMinutes: 5,
      breeds: [],
      seasons: [],
      tags: [],
      publishedAt: new Date().toISOString(),
    },
  );

  const [tagInput, setTagInput] = useState("");
  const [breedInput, setBreedInput] = useState("");
  const [seasonInput, setSeasonInput] = useState("");

  // Add tag
  const addTag = () => {
    if (
      tagInput.trim() &&
      formData.tags &&
      !formData.tags.includes(tagInput.trim())
    ) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput("");
    }
  };

  // Remove tag
  const removeTag = (tag: string) => {
    if (formData.tags) {
      setFormData({
        ...formData,
        tags: formData.tags.filter((t) => t !== tag),
      });
    }
  };

  // Add breed
  const addBreed = () => {
    if (
      breedInput.trim() &&
      formData.breeds &&
      !formData.breeds.includes(breedInput.trim())
    ) {
      setFormData({
        ...formData,
        breeds: [...formData.breeds, breedInput.trim()],
      });
      setBreedInput("");
    }
  };

  // Remove breed
  const removeBreed = (breed: string) => {
    if (formData.breeds) {
      setFormData({
        ...formData,
        breeds: formData.breeds.filter((b) => b !== breed),
      });
    }
  };

  // Add season
  const addSeason = () => {
    if (
      seasonInput &&
      formData.seasons &&
      !formData.seasons.includes(seasonInput as Season)
    ) {
      setFormData({
        ...formData,
        seasons: [...formData.seasons, seasonInput as Season],
      });
      setSeasonInput("");
    }
  };

  // Remove season
  const removeSeason = (season: Season) => {
    if (formData.seasons) {
      setFormData({
        ...formData,
        seasons: formData.seasons.filter((s) => s !== season),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title || !formData.summary || !formData.content) {
      alert("Title, summary, and content are required");
      return;
    }

    try {
      await onSubmit({
        ...formData,
        id: formData.id || `pn-${Date.now()}`,
        publishedAt: formData.publishedAt || new Date().toISOString(),
      });
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {article ? "Edit Article" : "Create New Article"}
          </h2>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]"
        >
          {/* 1. Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title || ""}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Article title (40-80 characters)"
              maxLength={100}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {formData.title?.length || 0}/100 characters
            </p>
          </div>

          {/* 2. Summary */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Summary *
            </label>
            <textarea
              value={formData.summary || ""}
              onChange={(e) =>
                setFormData({ ...formData, summary: e.target.value })
              }
              placeholder="Brief summary (100-150 characters)"
              maxLength={200}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 3. Content (Markdown) */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Content (Markdown) *
            </label>
            <textarea
              value={formData.content || ""}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Article content in markdown format"
              rows={8}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 4. Category */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Category *
            </label>
            <select
              value={formData.category || "seasonal"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as ArticleCategory,
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Severity */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Severity *
            </label>
            <select
              value={formData.severity || "info"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  severity: e.target.value as ArticleSeverity,
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SEVERITIES.map((sev) => (
                <option key={sev} value={sev}>
                  {sev.charAt(0).toUpperCase() + sev.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Source */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Source (Organization) *
            </label>
            <input
              type="text"
              value={formData.source || ""}
              onChange={(e) =>
                setFormData({ ...formData, source: e.target.value })
              }
              placeholder="e.g., WSAVA, AAHA, Indian Veterinary Association"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 7. Source URL */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Source URL
            </label>
            <input
              type="url"
              value={formData.sourceUrl || ""}
              onChange={(e) =>
                setFormData({ ...formData, sourceUrl: e.target.value })
              }
              placeholder="https://example.com/article"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 8. Image URL */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Image URL
            </label>
            <input
              type="url"
              value={formData.imageUrl || ""}
              onChange={(e) =>
                setFormData({ ...formData, imageUrl: e.target.value })
              }
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 9. Read Time (Minutes) */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Read Time (Minutes) *
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={formData.readTimeMinutes || 5}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  readTimeMinutes: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 10. Breeds */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Dog Breeds (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={breedInput}
                onChange={(e) => setBreedInput(e.target.value)}
                placeholder="Add breed..."
                list="breeds-list"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="breeds-list">
                {COMMON_BREEDS.map((breed) => (
                  <option key={breed} value={breed} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={addBreed}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.breeds?.map((breed) => (
                <span
                  key={breed}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm"
                >
                  {breed}
                  <button
                    type="button"
                    onClick={() => removeBreed(breed)}
                    className="hover:text-blue-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 11. Seasons */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Seasons (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <select
                value={seasonInput}
                onChange={(e) => setSeasonInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select season...</option>
                {SEASONS.map((season) => (
                  <option key={season} value={season}>
                    {season.charAt(0).toUpperCase() + season.slice(1)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addSeason}
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.seasons?.map((season) => (
                <span
                  key={season}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm"
                >
                  {season.charAt(0).toUpperCase() + season.slice(1)}
                  <button
                    type="button"
                    onClick={() => removeSeason(season)}
                    className="hover:text-green-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 12. Tags */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Tags (for searching)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-purple-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 13. Published Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Published Date
            </label>
            <input
              type="datetime-local"
              value={
                formData.publishedAt ? formData.publishedAt.slice(0, 16) : ""
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  publishedAt: new Date(e.target.value).toISOString(),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading
                ? "Saving..."
                : article
                  ? "Update Article"
                  : "Create Article"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewsForm;
