import React from "react";
import { Link } from "react-router-dom";
import { usePawphileData } from "../../context/PawphileDataContext";
import SeasonalAlertCard from "../../components/pawnews/SeasonalAlertCard";
import GuideGrid from "../../components/pawnews/GuideGrid";
import breedSeasonalRules, {
  FALLBACK_RULE,
} from "../../data/breedSeasonalRules";
import CARE_GUIDES from "../../data/careGuides";

export default function PawNewsPage() {
  const { dogProfile } = usePawphileData();

  // Map month to India-relevant season keys and labels
  const month = new Date().getMonth() + 1; // 1-12
  let seasonKey: "summer" | "monsoon" | "postMonsoon" | "winter" = "summer";
  let seasonLabel = "Summer Preparation";
  if (month >= 3 && month <= 5) {
    seasonKey = "summer";
    seasonLabel = "Summer Preparation";
  } else if (month >= 6 && month <= 9) {
    seasonKey = "monsoon";
    seasonLabel = "Monsoon";
  } else if (month >= 10 && month <= 11) {
    seasonKey = "postMonsoon";
    seasonLabel = "Post-Monsoon";
  } else {
    seasonKey = "winter";
    seasonLabel = "Winter";
  }

  // Resolve breed key (normalize and attempt substring match)
  const breedRaw = dogProfile?.breed || dogProfile?.name || null;
  const breedLower = breedRaw ? String(breedRaw).toLowerCase() : null;

  const matchedKey = breedLower
    ? Object.keys(breedSeasonalRules).find((k) => breedLower.includes(k)) ||
      Object.keys(breedSeasonalRules).find((k) => k.includes(breedLower))
    : null;

  const alertRule = matchedKey
    ? (breedSeasonalRules[matchedKey]?.[seasonKey] ?? FALLBACK_RULE)
    : FALLBACK_RULE;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 pb-24 space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">
            Seasonal Care & Guides
          </h1>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Personalized preventive alerts and a curated, trusted veterinary
            guide library.
          </p>
        </div>
      </div>

      {!dogProfile ? (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <h2 className="text-lg font-black">Complete Your Dog Profile</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Set up your dog's breed and age to unlock personalized seasonal
            health alerts.
          </p>
          <div className="mt-4">
            <Link
              to="/profile"
              className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold"
            >
              Go to Profile Setup
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <SeasonalAlertCard
            breed={dogProfile.breed ?? null}
            season={seasonLabel}
            age={dogProfile.age ?? null}
            alert={alertRule}
          />

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">Essential Care Guides</h2>
            </div>
            <GuideGrid guides={CARE_GUIDES} />
          </section>
        </div>
      )}
    </div>
  );
}
