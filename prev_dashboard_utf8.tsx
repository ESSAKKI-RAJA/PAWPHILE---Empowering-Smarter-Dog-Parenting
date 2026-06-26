import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";
import {
  Settings,
  Camera,
  Activity,
  ShieldAlert,
  UtensilsCrossed,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Scale,
  Eye,
  Footprints,
  Flame,
  Info,
  Bell,
} from "lucide-react";
import { usePawphileData } from "../context/PawphileDataContext";
import { calculateWellnessScore } from "../engines/healthEngine";
import { daysUntil } from "../lib/dateUtils";
import pawNewsArticles from "../data/pawNews";
import { calculateBCS, calculateMER } from "../utils/bcsUtils";
import { getWeatherAlert } from "../services/apiClient";
import breedSeasonalRules, { FALLBACK_RULE } from "../data/breedSeasonalRules";

/* ΓöÇΓöÇ Tiny helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
// Deprecated: bcsFromProfile is replaced by calculateBCS from bcsUtils

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    selectedDog,
    vaccineRecords,
    dewormingRecords,
    symptomLogs,
    behaviorLogs,
    vetVisits,
    triageResults,
    nutritionLogs,
  } = usePawphileData();
  const [tipDismissed, setTipDismissed] = useState(false);
  const [weatherAlert, setWeatherAlert] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    const fetchWeather = async (lat: number, lng: number) => {
      try {
        const res = await getWeatherAlert(lat, lng);
        if (mounted && res && res.weather) {
          setWeatherAlert(res.weather);
        }
      } catch (err) {
        console.warn("Failed to fetch weather alert", err);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        // Fallback to default (Chennai coordinates)
        fetchWeather(13.0827, 80.2707);
      },
      { timeout: 5000 }
    );

    return () => { mounted = false; };
  }, []);

  /* ΓöÇΓöÇ Computed values ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  const wellness = useMemo(() => {
    if (!selectedDog) return null;
    return calculateWellnessScore(
      selectedDog,
      vaccineRecords.filter((r) => r.dogId === selectedDog.id),
      dewormingRecords.filter((r) => r.dogId === selectedDog.id),
      symptomLogs.filter((r) => r.dogId === selectedDog.id),
      behaviorLogs.filter((r) => r.dogId === selectedDog.id),
      vetVisits.filter((r) => r.dogId === selectedDog.id),
      nutritionLogs.filter((r) => r.dogId === selectedDog.id),
    );
  }, [
    selectedDog,
    vaccineRecords,
    dewormingRecords,
    symptomLogs,
    behaviorLogs,
    vetVisits,
    nutritionLogs,
  ]);

  const bcs = useMemo(() => {
    if (!selectedDog) return null;
    const res = calculateBCS(selectedDog);
    let color = "#14b8a6";
    if (res.label === 'Underweight') color = "#06b6d4";
    else if (res.label === 'Overweight') color = "#f59e0b";
    else if (res.label === 'Obese') color = "#ef4444";

    const heightCm = (selectedDog as any).heightCm || (selectedDog as any).height || 0;
    const weight = selectedDog.weight || (selectedDog as any).weightKg || 0;
    let bmi = 0;
    if (heightCm > 0 && weight > 0) {
      bmi = Math.round((weight / Math.pow(heightCm / 100, 2)) * 10) / 10;
    }

    return {
      score: res.score,
      label: res.label,
      color,
      idealRange: `${res.idealRange[0]} ΓÇô ${res.idealRange[1]} kg`,
      advice: res.advice,
      bmi
    };
  }, [selectedDog]);

  const todayCalTarget = useMemo(() => {
    if (!selectedDog) return 0;
    return calculateMER(selectedDog);
  }, [selectedDog]);

  const todayCalLogged = useMemo(() => {
    if (!selectedDog) return 0;
    const todayStr = new Date().toISOString().split("T")[0];
    return nutritionLogs
      .filter(
        (l) => l.dogId === selectedDog.id && l.createdAt?.startsWith(todayStr),
      )
      .reduce((s: number, l: any) => s + (l.totalCalories || l.calories || 0), 0);
  }, [selectedDog, nutritionLogs]);

  const latestTriage = useMemo(() => {
    if (!selectedDog) return null;
    const mine = triageResults
      .filter((t) => t.dogId === selectedDog.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!mine.length) return null;
    const t = mine[0];
    const log = symptomLogs.find((l) => l.id === t.symptomLogId);
    return {
      severity: t.severity,
      concern: log?.mainConcern || "Health Check",
    };
  }, [selectedDog, triageResults, symptomLogs]);

  const weatherBanner = useMemo(() => {
    if (!weatherAlert || !selectedDog) return null;
    const isMonsoon = weatherAlert.is_monsoon_season || weatherAlert.has_rain || weatherAlert.high_humidity;
    if (!isMonsoon) return null;

    const breedKey = selectedDog.breed.toLowerCase().trim();
    const rules = breedSeasonalRules[breedKey] || {};
    const monsoonRule = rules.monsoon || FALLBACK_RULE;

    return {
      title: monsoonRule.title,
      message: monsoonRule.message,
      recommendations: monsoonRule.recommendations,
      severity: monsoonRule.severity,
      temp: weatherAlert.temp,
      humidity: weatherAlert.humidity,
      condition: weatherAlert.condition
    };
  }, [weatherAlert, selectedDog]);

  const preventiveAlerts = useMemo(() => {
    if (!selectedDog) return [];
    const alerts: Array<{
      label: string;
      sub: string;
      color: string;
      path: string;
    }> = [];
    const myVacs = vaccineRecords
      .filter((r) => r.dogId === selectedDog.id)
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
    if (myVacs.length) {
      const diff = daysUntil(myVacs[0].nextDueDate);
      if (diff <= 30)
        alerts.push({
          label: `Vaccine: ${myVacs[0].vaccineName}`,
          sub:
            diff < 0
              ? "Overdue!"
              : `Due in ${diff} day${diff !== 1 ? "s" : ""}`,
          color: diff < 0 ? "#ef4444" : "#f59e0b",
          path: "/preventive-care",
        });
    } else {
      alerts.push({
        label: "Vaccines",
        sub: "No records yet ΓÇö add your first",
        color: "#94a3b8",
        path: "/preventive-care",
      });
    }
    const myDews = dewormingRecords
      .filter((r) => r.dogId === selectedDog.id)
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
    if (myDews.length) {
      const diff = daysUntil(myDews[0].nextDueDate);
      if (diff <= 30)
        alerts.push({
          label: "Deworming / Prevention",
          sub:
            diff < 0
              ? "Overdue! Review schedule with your vet (every 3 months recommended)"
              : `Due in ${diff} days ΓÇö Review schedule with your vet`,
          color: diff < 0 ? "#ef4444" : "#f59e0b",
          path: "/preventive-care",
        });
    } else {
      alerts.push({
        label: "Deworming / Prevention",
        sub: "Review schedule with your vet (every 3 months recommended)",
        color: "#f59e0b",
        path: "/preventive-care",
      });
    }
    return alerts;
  }, [selectedDog, vaccineRecords, dewormingRecords]);

  const latestArticles = useMemo(() => {
    if (!selectedDog) return [];
    // Get current season
    const currentMonth = new Date().getMonth() + 1;
    let currentSeason = "winter";
    if (currentMonth >= 3 && currentMonth <= 5) currentSeason = "summer";
    else if (currentMonth >= 6 && currentMonth <= 9)
      currentSeason = "monsoon";
    else if (currentMonth >= 10 && currentMonth <= 11)
      currentSeason = "postMonsoon";

    // Get dog's breed
    const dogBreed = selectedDog.breed || "";

    // Sort articles by relevance
    return [...pawNewsArticles]
      .map((a) => {
        let score = 0;
        // Priority: critical > warning > info
        if (a.severity === "critical") score += 1000;
        else if (a.severity === "warning") score += 500;

        // Second priority: matches current season
        if (a.seasons?.includes(currentSeason as any)) score += 100;

        // Third priority: matches dog's breed
        if (
          dogBreed &&
          a.breeds?.some(
            (b) => b.toLowerCase() === dogBreed.toLowerCase(),
          )
        )
          score += 50;

        return { article: a, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.article);
  }, [selectedDog]);

  /* ΓöÇΓöÇ No dog ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  if (!selectedDog) {
    return (
      <div className="pw-page flex flex-col items-center justify-center min-h-screen px-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{
            background: "var(--teal-dim)",
            border: "2px solid var(--teal)",
          }}
        >
          <Scale className="w-10 h-10" style={{ color: "var(--teal)" }} />
        </div>
        <h1
          className="text-2xl font-black mb-2"
          style={{ color: "var(--text)" }}
        >
          Welcome to PAWPHILE
        </h1>
        <p
          className="text-sm font-semibold mb-8 text-center max-w-xs"
          style={{ color: "var(--text-2)" }}
        >
          Your dog's complete health companion. Add your dog to get started.
        </p>
        <button
          onClick={() => navigate("/profile")}
          className="pw-btn-teal text-base px-8 py-4"
        >
          + Add Dog Profile
        </button>
      </div>
    );
  }

  /* ΓöÇΓöÇ Wellness ring calc ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  const wsScore = wellness?.score ?? 72;
  const wsZone = wellness?.zone ?? "green";
  const ringColor =
    wsZone === "green"
      ? "#14b8a6"
      : wsZone === "yellow"
        ? "#f59e0b"
        : "#ef4444";
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (wsScore / 100) * circ;

  const zoneLabelMap: Record<string, string> = {
    green: "Good",
    yellow: "Needs Attention",
    red: "Urgent",
  };
  const zoneDotMap: Record<string, string> = {
    green: "#22c55e",
    yellow: "#f59e0b",
    red: "#ef4444",
  };

  return (
    <div className="pw-page pb-28" style={{ minHeight: "100vh" }}>
      {/* ΓöÇΓöÇ Header ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
        style={{
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
          style={{
            background: "var(--card)",
            border: "2px solid var(--border-2)",
          }}
        >
          {selectedDog.photoUrl ? (
            <img
              src={selectedDog.photoUrl}
              alt={selectedDog.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-black text-lg"
              style={{ background: "var(--teal-dim)", color: "var(--teal)" }}
            >
              {selectedDog.name[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-black text-base leading-tight truncate"
            style={{ color: "var(--text)" }}
          >
            {selectedDog.name.toUpperCase()}
          </p>
          <p
            className="text-xs font-semibold truncate"
            style={{ color: "var(--text-2)" }}
          >
            {selectedDog.breed} ┬╖ {selectedDog.age || "?"} yrs ┬╖{" "}
            {selectedDog.weight
              ? `${selectedDog.weight} ${selectedDog.weightUnit || "kg"}`
              : "?"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="pw-btn-teal px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <button
            onClick={() => navigate("/settings")}
            className="p-2 rounded-full"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <Settings className="w-5 h-5" style={{ color: "var(--text-2)" }} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {/* ΓöÇΓöÇ Weather / Monsoon Alert Banner ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        {weatherBanner && (
          <div className="pw-card p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 flex flex-col gap-2 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-400 uppercase">
                  Γÿö Monsoon Alert: {weatherBanner.condition} ({weatherBanner.temp}┬░C, {weatherBanner.humidity}% Humidity)
                </p>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                  {weatherBanner.title}
                </h3>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 capitalize`}>
                {weatherBanner.severity} Risk
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {weatherBanner.message}
            </p>
            {weatherBanner.recommendations && weatherBanner.recommendations.length > 0 && (
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1 pl-4 space-y-0.5">
                {weatherBanner.recommendations.map((rec: string, i: number) => (
                  <div key={i}>ΓÇó {rec}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ΓöÇΓöÇ 1. Wellness Score ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        <button
          onClick={() => navigate("/reports")}
          className="pw-card w-full p-5 flex items-center gap-5 text-left"
        >
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] font-black tracking-[0.18em] uppercase mb-1"
              style={{ color: "var(--text-2)" }}
            >
              Wellness Score
            </p>
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-5xl font-black leading-none"
                style={{ color: "var(--text)" }}
              >
                {wsScore}
              </span>
              <span
                className="text-base font-bold"
                style={{ color: "var(--text-2)" }}
              >
                /100
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className="text-sm font-bold"
                style={{ color: "var(--text)" }}
              >
                {zoneLabelMap[wsZone]}
              </span>
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: zoneDotMap[wsZone] }}
              />
            </div>
          </div>
          {/* Ring */}
          <div className="w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="var(--border-2)"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={ringColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
              />
            </svg>
          </div>
        </button>

        {/* ΓöÇΓöÇ 2. Estimated BCS ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        {bcs && (
          <button
            onClick={() => navigate("/bmi")}
            className="pw-card w-full p-5 text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5" style={{ color: "#f59e0b" }} />
                <span className="font-black" style={{ color: "var(--text)" }}>
                  Estimated BCS
                </span>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: "var(--text-2)" }}
                >
                  BMI / Obesity Estimate
                </span>
              </div>
              <div className="text-right">
                <span
                  className="text-2xl font-black"
                  style={{ color: "#f59e0b" }}
                >
                  {bcs.score}/9
                </span>
                <p className="text-xs font-bold" style={{ color: bcs.color }}>
                  {bcs.label}
                </p>
              </div>
            </div>
            {/* Green progress bar */}
            <div
              className="h-1.5 rounded-full overflow-hidden mb-3"
              style={{ background: "var(--border-2)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(bcs.score / 9) * 100}%`,
                  background: bcs.color,
                }}
              />
            </div>
            <p
              className="text-xs font-semibold mb-3"
              style={{ color: "var(--text-2)" }}
            >
              Ideal range: {bcs.idealRange}
            </p>
            <div
              className="rounded-xl p-3 mb-3"
              style={{
                background: "var(--card-2)",
                border: "1px solid var(--border)",
              }}
            >
              <p
                className="text-sm font-semibold leading-relaxed"
                style={{ color: "var(--text)" }}
              >
                {bcs.advice}
              </p>
            </div>
            {bcs.bmi > 0 && (
              <div
                className="rounded-xl p-3 mb-3 flex items-center justify-between"
                style={{
                  background: "var(--card-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" style={{ color: "var(--teal)" }} />
                  <span className="text-xs font-bold" style={{ color: "var(--text-2)" }}>
                    Estimated BMI
                  </span>
                </div>
                <span className="text-lg font-black" style={{ color: "var(--text)" }}>
                  {bcs.bmi}
                </span>
              </div>
            )}
            <p
              className="text-[11px] italic"
              style={{ color: "var(--text-3)" }}
            >
              This is an algorithmic estimate based on profile data. True BCS
              requires physical assessment by a veterinarian (WSAVA guidelines).
            </p>
          </button>
        )}

        {/* ΓöÇΓöÇ 3. Nutrition Tracker ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        <button
          onClick={() => navigate("/nutrition")}
          className="pw-card w-full p-5 text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5" style={{ color: "#f97316" }} />
              <span className="font-black" style={{ color: "var(--text)" }}>
                Nutrition Tracker
              </span>
            </div>
            <div
              className="flex items-center gap-1"
              style={{ color: "var(--teal)" }}
            >
              <span className="text-sm font-bold">Log Food</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
          <p
            className="text-lg font-black mb-3"
            style={{ color: "var(--text)" }}
          >
            <span style={{ color: "var(--text-2)" }}>{todayCalLogged}</span>
            <span
              className="text-sm font-bold ml-1"
              style={{ color: "var(--text-2)" }}
            >
              / {todayCalTarget} kcal target
            </span>
          </p>
          <div
            className="h-1.5 rounded-full overflow-hidden mb-3"
            style={{ background: "var(--border-2)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, todayCalTarget > 0 ? (todayCalLogged / todayCalTarget) * 100 : 0)}%`,
                background: "var(--teal)",
              }}
            />
          </div>
          <p className="text-[11px] italic" style={{ color: "var(--text-3)" }}>
            MER estimate based on profile. Confirm targets with your
            veterinarian.
          </p>
        </button>

        {/* ΓöÇΓöÇ 3.5. Latest Articles ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        <button
          onClick={() => navigate("/pawnews")}
          className="pw-card w-full p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">≡ƒô░</span>
              <span className="font-black" style={{ color: "var(--text)" }}>
                Latest for {selectedDog.name}
              </span>
            </div>
            <ChevronRight
              className="w-5 h-5"
              style={{ color: "var(--text-2)" }}
            />
          </div>
          <div className="space-y-2">
            {latestArticles.map((article) => (
              <div
                key={article.id}
                className="rounded-lg p-3"
                style={{
                  background: "var(--card-2)",
                  border: "1px solid var(--border)",
                }}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/pawnews");
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-bold text-left line-clamp-2"
                      style={{ color: "var(--text)" }}
                    >
                      {article.title}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--text-2)" }}
                    >
                      {article.readTimeMinutes} min read
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ${
                      article.severity === "critical"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                        : article.severity === "warning"
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                          : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200"
                    }`}
                  >
                    {article.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p
            className="text-xs font-semibold text-center mt-3"
            style={{ color: "var(--text-2)" }}
          >
            View all ΓåÆ
          </p>
        </button>

        {/* ΓöÇΓöÇ 4. Vision AI Scan ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        <button
          onClick={() => navigate("/vision")}
          className="pw-card w-full p-4 flex items-center gap-4 text-left"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.3)",
            }}
          >
            <Camera className="w-5 h-5" style={{ color: "#a78bfa" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black" style={{ color: "var(--text)" }}>
              Vision AI Scan
            </p>
            <p
              className="text-xs font-semibold"
              style={{ color: "var(--text-2)" }}
            >
              Photo analysis for skin, eye &amp; ear conditions
            </p>
          </div>
          <ChevronRight
            className="w-5 h-5 flex-shrink-0"
            style={{ color: "var(--text-2)" }}
          />
        </button>

        {/* ΓöÇΓöÇ 5. PAWAI Health Triage ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        <div className="pw-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "var(--teal-dim)",
                border: "1px solid var(--teal-glow)",
              }}
            >
              <Activity className="w-5 h-5" style={{ color: "var(--teal)" }} />
            </div>
            <div>
              <p className="font-black" style={{ color: "var(--text)" }}>
                PAWAI Health Triage
              </p>
              <p
                className="text-xs font-semibold"
                style={{ color: "var(--text-2)" }}
              >
                Early symptom guidance ΓÇö severity check, warning signs, and safe
                next steps.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/triage")}
            className="w-full py-3 rounded-xl font-black text-base mb-3 transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: "var(--teal)", color: "#fff" }}
          >
            Start Triage ΓåÆ
          </button>
          {latestTriage && (
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--text-2)" }}
              >
                Last result:
              </span>
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    latestTriage.severity === "red"
                      ? "#ef4444"
                      : latestTriage.severity === "yellow"
                        ? "#f59e0b"
                        : "#22c55e",
                }}
              />
              <span
                className="text-xs font-bold truncate"
                style={{ color: "var(--text)" }}
              >
                {latestTriage.severity === "red"
                  ? "Emergency"
                  : latestTriage.severity === "yellow"
                    ? "Urgent"
                    : "Normal"}{" "}
                ┬╖ {latestTriage.concern}
              </span>
            </div>
          )}
        </div>

        {/* ΓöÇΓöÇ 6. Preventive Alerts ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        <div className="pw-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4" style={{ color: "#f59e0b" }} />
            <span
              className="font-black text-sm"
              style={{ color: "var(--text)" }}
            >
              Preventive Alerts
            </span>
          </div>
          <div className="space-y-2">
            {preventiveAlerts.map((a, i) => (
              <button
                key={i}
                onClick={() => navigate(a.path)}
                className="w-full flex items-center justify-between p-3 rounded-xl text-left"
                style={{
                  background: "rgba(245,158,11,0.10)",
                  border: `1px solid rgba(245,158,11,0.25)`,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: a.color }}
                  />
                  <div className="min-w-0">
                    <p
                      className="text-sm font-black truncate"
                      style={{ color: "var(--text)" }}
                    >
                      {a.label}
                    </p>
                    <p
                      className="text-[11px] font-semibold truncate"
                      style={{ color: a.color }}
                    >
                      {a.sub}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className="w-4 h-4 flex-shrink-0 ml-2"
                  style={{ color: "var(--text-2)" }}
                />
              </button>
            ))}
          </div>
          <p
            className="text-[10px] italic mt-3 leading-relaxed"
            style={{ color: "var(--text-3)" }}
          >
            Vaccine and deworming timelines vary by region and lifestyle.
            Consult your veterinarian for a personalised schedule. (Ref: AAHA,
            WSAVA guidelines)
          </p>
        </div>

        {/* ΓöÇΓöÇ 7. Today's Wellness ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        <div className="pw-card p-5">
          <p className="font-black mb-3" style={{ color: "var(--text)" }}>
            Today's Wellness
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Activity */}
            <button
              onClick={() => navigate("/reminders")}
              className="rounded-xl p-4 flex flex-col items-center gap-2"
              style={{
                background: "var(--card-2)",
                border: "1px solid var(--border)",
              }}
            >
              <Footprints
                className="w-7 h-7"
                style={{ color: "var(--teal)" }}
              />
              <p
                className="text-xs font-black"
                style={{ color: "var(--text)" }}
              >
                Activity
              </p>
              <p
                className="text-[11px] font-semibold"
                style={{ color: "var(--text-2)" }}
              >
                Not logged
              </p>
            </button>
            {/* Calories */}
            <button
              onClick={() => navigate("/nutrition")}
              className="rounded-xl p-4 flex flex-col items-center gap-2"
              style={{
                background: "var(--card-2)",
                border: "1px solid var(--border)",
              }}
            >
              <UtensilsCrossed
                className="w-7 h-7"
                style={{ color: "var(--teal)" }}
              />
              <p
                className="text-xs font-black"
                style={{ color: "var(--text)" }}
              >
                Calories
              </p>
              <p
                className="text-[11px] font-semibold"
                style={{ color: "var(--text-2)" }}
              >
                {todayCalLogged > 0 ? `${todayCalLogged} kcal` : "Not logged"}
              </p>
            </button>
          </div>
        </div>

        {/* ΓöÇΓöÇ 8. Daily Tip ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        {!tipDismissed && (
          <button
            className="pw-card w-full p-4 text-left"
            onClick={() => setTipDismissed(true)}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(6,182,212,0.15)" }}
              >
                <Info className="w-4 h-4" style={{ color: "#06b6d4" }} />
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm font-black"
                  style={{ color: "var(--text)" }}
                >
                  Daily Tip
                </p>
                <p
                  className="text-xs font-semibold leading-relaxed mt-1"
                  style={{ color: "var(--text-2)" }}
                >
                  Regular vet check-ups (at least once a year) help catch health
                  issues before they become serious ΓÇö even in dogs that appear
                  healthy.
                </p>
              </div>
            </div>
          </button>
        )}

        {/* ΓöÇΓöÇ Quick Links row ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Eye, label: "Vision", path: "/vision", color: "#a78bfa" },
            {
              icon: ShieldAlert,
              label: "Care",
              path: "/preventive-care",
              color: "#14b8a6",
            },
            {
              icon: CheckCircle,
              label: "Behavior",
              path: "/behavior",
              color: "#22c55e",
            },
            {
              icon: UtensilsCrossed,
              label: "Food Safe",
              path: "/food-safety",
              color: "#f97316",
            },
          ].map(({ icon: Icon, label, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="pw-card p-3 flex flex-col items-center gap-1.5"
            >
              <Icon className="w-5 h-5" style={{ color }} />
              <span
                className="text-[10px] font-bold"
                style={{ color: "var(--text-2)" }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        <p
          className="text-[10px] italic text-center pb-2 leading-relaxed px-4"
          style={{ color: "var(--text-3)" }}
        >
          PAWPHILE is not a diagnostic tool. Always consult a licensed
          veterinarian for medical decisions.
        </p>
      </div>
    </div>
  );
}
