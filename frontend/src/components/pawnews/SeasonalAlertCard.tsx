import React from "react";
import { AlertTriangle, Star, CheckCircle } from "lucide-react";

type Props = {
  breed: string | null;
  season: string;
  age?: number | null;
  alert: {
    severity: "low" | "medium" | "high";
    title: string;
    message: string;
    recommendations: string[];
  };
};

export default function SeasonalAlertCard({
  breed,
  season,
  age,
  alert,
}: Props) {
  const severityColor =
    alert.severity === "high"
      ? "text-red-500 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800"
      : alert.severity === "medium"
        ? "text-amber-500 bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800"
        : "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800";

  return (
    <div className={`p-5 rounded-2xl border ${severityColor} shadow-md`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-current" />
          </div>
          <div>
            <h3 className="text-lg font-black">{alert.title}</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
              {alert.message}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-white/10">
                {breed ? breed : "Unknown breed"}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/5">
                {season}
              </span>
              {typeof age === "number" && (
                <span className="px-3 py-1 rounded-full text-xs">
                  Age: {age} yrs
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider">
            Severity
          </span>
          <span className="px-3 py-1 rounded-full text-sm font-bold bg-white/10 flex items-center gap-2">
            {alert.severity === "high" ? (
              <Star className="w-4 h-4 text-red-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            )}
            {alert.severity}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {alert.recommendations.map((r, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="text-teal-500">•</span>
            <p className="text-sm text-slate-700 dark:text-slate-300">{r}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
