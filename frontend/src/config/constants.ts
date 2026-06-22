export const COLORS = {
  primary: '#0D9488', // teal-600
  primaryDark: '#0F766E', // teal-700
  primaryLight: '#CCFBF1', // teal-50
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  red: '#EF4444',
  redLight: '#FEE2E2',
  green: '#10B981',
  greenLight: '#D1FAE5',
  background: '#F8FAFC',
  card: '#FFFFFF',
  textHeader: '#1E293B',
  textBody: '#475569',
  textMuted: '#94A3B8',
};

export const ROUTES = {
  HOME: '/dashboard',
  SYMPTOMS: '/symptoms',
  EMERGENCY: '/emergency',
  VACCINES: '/vaccines',
  NUTRITION: '/nutrition',
  BEHAVIOR: '/behavior',
  WALK: '/walk',
  VETS: '/vets',
  PROFILE: '/profile',
  VISION: '/vision',
  TRIAGE: '/triage',
};

export const URGENCY_COLORS = {
  emergency: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-500', fill: '#EF4444' },
  urgent: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-500', fill: '#F59E0B' },
  monitor: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-500', fill: '#3B82F6' },
  normal: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-500', fill: '#10B981' },
};

export const GRADE_COLORS = {
  Excellent: { text: 'text-green-600', stroke: '#10B981' },
  Good: { text: 'text-teal-600', stroke: '#0D9488' },
  Fair: { text: 'text-amber-600', stroke: '#F59E0B' },
  Poor: { text: 'text-red-600', stroke: '#EF4444' },
};

export const TOXIC_FOODS_GLOBAL = [
  'Chocolate',
  'Grapes & Raisins',
  'Onions & Garlic',
  'Xylitol (Artificial Sweetener)',
  'Macadamia Nuts',
  'Avocado',
  'Alcohol',
  'Caffeine',
];

export const COMMON_SYMPTOMS = [
  { id: 'vomiting', label: 'Vomiting' },
  { id: 'diarrhea', label: 'Diarrhea' },
  { id: 'lethargy', label: 'Lethargy' },
  { id: 'not_eating', label: 'Not Eating' },
  { id: 'itching', label: 'Itching' },
  { id: 'limping', label: 'Limping' },
  { id: 'coughing', label: 'Coughing' },
  { id: 'eye_discharge', label: 'Eye Discharge' },
  { id: 'ear_scratching', label: 'Ear Scratching' },
  { id: 'fever', label: 'Fever Signs' },
  { id: 'bloody_stool', label: 'Bloody Stool' },
  { id: 'seizure', label: 'Seizure' },
  { id: 'collapse', label: 'Collapse' },
  { id: 'breathing_trouble', label: 'Breathing Trouble' },
  { id: 'excessive_thirst', label: 'Excessive Thirst' },
  { id: 'hair_loss', label: 'Hair Loss' },
  { id: 'swollen_belly', label: 'Swollen Belly' },
  { id: 'scooting', label: 'Scooting' },
];
