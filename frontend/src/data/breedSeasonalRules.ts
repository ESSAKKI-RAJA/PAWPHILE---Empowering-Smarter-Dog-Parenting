export type SeasonalRule = {
  severity: "low" | "medium" | "high";
  title: string;
  message: string;
  recommendations: string[];
};

type BreedRules = Partial<
  Record<"summer" | "monsoon" | "postMonsoon" | "winter", SeasonalRule>
>;

export const breedSeasonalRules: Record<string, BreedRules> = {
  pug: {
    summer: {
      severity: "high",
      title: "Heatstroke Risk",
      message:
        "Pugs are highly susceptible to heatstroke due to their shortened airway structure.",
      recommendations: [
        "Walk before 8 AM",
        "Avoid afternoon heat",
        "Carry water",
        "Monitor excessive panting",
      ],
    },
    monsoon: {
      severity: "medium",
      title: "Humidity & Respiratory Care",
      message: "High humidity can worsen breathing for brachycephalic breeds.",
      recommendations: [
        "Avoid strenuous play on humid days",
        "Keep fur dry and ventilated",
      ],
    },
    winter: {
      severity: "low",
      title: "Dry Air Care",
      message: "Monitor for dry nose and skin — keep hydration up.",
      recommendations: ["Provide warm bedding", "Maintain hydration"],
    },
  },
  "labrador retriever": {
    summer: {
      severity: "medium",
      title: "Dehydration & Heat",
      message:
        "Labs are active and can dehydrate quickly in high heat/humidity.",
      recommendations: [
        "Increase water intake",
        "Avoid afternoon walks",
        "Offer shaded play areas",
      ],
    },
    monsoon: {
      severity: "medium",
      title: "Tick & Parasite Risk",
      message: "Monsoon increases tick and flea activity in grassy/wet areas.",
      recommendations: [
        "Check for ticks after walks",
        "Keep coat dry",
        "Use vet-recommended parasite prevention",
      ],
    },
  },
  "golden retriever": {
    summer: {
      severity: "medium",
      title: "Heat & Activity",
      message:
        "Goldens love water but can still overheat during long play sessions.",
      recommendations: [
        "Supervise vigorous play",
        "Provide fresh water",
        "Prefer early morning swims",
      ],
    },
    monsoon: {
      severity: "medium",
      title: "Coat & Skin Care",
      message: "Wet coats can trap moisture and cause skin irritation.",
      recommendations: [
        "Dry coat thoroughly after rain",
        "Inspect skin for hotspots",
      ],
    },
  },
  "german shepherd": {
    summer: {
      severity: "medium",
      title: "Heat & Workload",
      message: "Keep heavy exertion to cooler parts of the day.",
      recommendations: [
        "Shorter training in heat",
        "Plenty of water",
        "Watch for lethargy",
      ],
    },
  },
  husky: {
    summer: {
      severity: "high",
      title: "Heat Intolerance",
      message: "Huskies are built for cold climates — heat can be dangerous.",
      recommendations: [
        "Keep indoors during peak heat",
        "Offer cool resting surfaces",
        "Never shave the coat",
      ],
    },
  },
  beagle: {
    monsoon: {
      severity: "medium",
      title: "Tick & Lepto Awareness",
      message:
        "Beagles that sniff and root are at increased exposure to ticks.",
      recommendations: [
        "Inspect for ticks",
        "Avoid stagnant water",
        "Follow parasite prevention schedule",
      ],
    },
  },
  "shih tzu": {
    summer: {
      severity: "high",
      title: "Heat & Respiratory Risk",
      message: "Small brachycephalic breeds can overheat quickly.",
      recommendations: [
        "Keep cool indoors",
        "Avoid heavy play in heat",
        "Trim face fur for airflow",
      ],
    },
  },
};

export const FALLBACK_RULE: SeasonalRule = {
  severity: "low",
  title: "General Preventive Care",
  message:
    "Maintain hydration, parasite prevention, and watch activity during extreme weather.",
  recommendations: [
    "Keep water available",
    "Follow routine parasite prevention",
    "Avoid extremes of temperature",
  ],
};

export default breedSeasonalRules;
