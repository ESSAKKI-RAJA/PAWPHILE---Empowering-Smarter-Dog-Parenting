import { PawNewsItem, SeasonalAlert } from './pawnews';

export const CHENNAI_TODAY: PawNewsItem[] = [
  {
    id: 'chennai-1',
    title: 'Heat & Humidity Care',
    summary: 'Prefer early morning or late evening walks during hot days. Carry water and avoid hot pavement.',
    category: 'Seasonal',
    region: 'Chennai',
    location: 'Chennai, TN',
    source: 'PAWPHILE Health Desk',
    trustLabel: 'Manually reviewed',
    isVerified: true,
    publishedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    refreshCycle: '24h',
    url: 'https://www.akc.org/expert-advice/health/dogs-and-heatstroke/',
    tags: ['heat', 'summer', 'walking'],
    date: '2024-05-15',
    readTime: '1 min'
  },
  {
    id: 'chennai-2',
    title: 'Monsoon Tick Watch',
    summary: 'After rain or grass walks, check paws, belly, ears, and fur for ticks. High humidity increases tick activity.',
    category: 'Parasites',
    region: 'Chennai',
    location: 'Chennai, TN',
    source: 'Veterinary Advisory',
    trustLabel: 'Source-backed',
    isVerified: true,
    publishedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    refreshCycle: '24h',
    url: 'https://www.akc.org/expert-advice/health/ticks-on-dogs/',
    tags: ['ticks', 'monsoon', 'prevention'],
    date: '2024-05-10',
    readTime: '2 min'
  },
  {
    id: 'chennai-3',
    title: 'Street-Dog Contact Safety',
    summary: 'Ensure your dog’s core vaccines are up to date before interactions. Avoid letting them eat items off the street.',
    category: 'Safety',
    region: 'Chennai',
    location: 'Chennai, TN',
    source: 'PAWPHILE Safety',
    trustLabel: 'Manually reviewed',
    isVerified: true,
    publishedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    refreshCycle: '24h',
    url: 'https://www.cdc.gov/rabies/specific_groups/dogs_cats/index.html',
    tags: ['vaccines', 'safety', 'street dogs'],
    date: '2024-05-01',
    readTime: '2 min'
  }
];

export const INDIA_UPDATES: PawNewsItem[] = [
  {
    id: 'india-1',
    title: 'Tick Fever & Parasites Awareness',
    summary: 'Tick-borne diseases are common across India. Use vet-approved preventatives and check regularly.',
    category: 'Parasites',
    region: 'India',
    location: 'India',
    source: 'National Vet Board',
    trustLabel: 'Unverified local update',
    isVerified: false,
    publishedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    refreshCycle: 'Weekly',
    url: 'https://www.akc.org/expert-advice/health/tick-borne-diseases-in-dogs/',
    tags: ['ticks', 'fever', 'prevention'],
    date: '2024-04-20',
    readTime: '3 min'
  },
  {
    id: 'india-2',
    title: 'Rabies & Core Vaccination Reminder',
    summary: 'Annual anti-rabies vaccination is critical and legally mandated. Keep your records updated.',
    category: 'Vaccination',
    region: 'India',
    location: 'India',
    source: 'Govt Health Directive',
    trustLabel: 'Source-backed',
    isVerified: true,
    publishedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
    refreshCycle: 'Monthly',
    url: 'https://www.who.int/news-room/fact-sheets/detail/rabies',
    tags: ['rabies', 'vaccines', 'law'],
    date: '2024-03-15',
    readTime: '2 min'
  },
  {
    id: 'india-3',
    title: 'Parvo Safety for Puppies',
    summary: 'Avoid taking unvaccinated puppies to public parks or streets until their parvo/distemper series is complete.',
    category: 'Puppy',
    region: 'India',
    location: 'India',
    source: 'PAWPHILE Puppy Care',
    trustLabel: 'Manually reviewed',
    isVerified: true,
    publishedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    refreshCycle: 'Weekly',
    url: 'https://www.avma.org/resources-tools/pet-owners/petcare/canine-parvovirus',
    tags: ['parvo', 'puppy', 'vaccines'],
    date: '2024-02-10',
    readTime: '3 min'
  }
];

export const DOG_TIPS: PawNewsItem[] = [
  {
    id: 'tip-1',
    title: 'Paw Cleaning After Walks',
    summary: 'Wipe paws with a damp cloth or pet wipes after walks to remove dirt, allergens, and prevent licking.',
    category: 'Tips',
    region: 'Global',
    location: 'Global',
    source: 'PAWPHILE Hygiene',
    trustLabel: 'Manually reviewed',
    isVerified: true,
    publishedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    refreshCycle: 'Weekly',
    url: 'https://www.akc.org/expert-advice/health/how-to-clean-dogs-paws/',
    tags: ['hygiene', 'paws', 'walking'],
    date: '2024-01-05',
    readTime: '1 min'
  },
  {
    id: 'tip-2',
    title: 'Vomiting Red Flags',
    summary: 'Isolated vomiting might just be an upset stomach, but repeated vomiting, lethargy, or inability to keep water down requires urgent vet care.',
    category: 'Health',
    region: 'Global',
    location: 'Global',
    source: 'Veterinary Emergency Guide',
    trustLabel: 'Source-backed',
    isVerified: true,
    publishedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    refreshCycle: 'Weekly',
    url: 'https://www.akc.org/expert-advice/health/dog-vomiting-causes-diagnosis-and-treatment/',
    tags: ['vomiting', 'emergency', 'symptoms'],
    date: '2023-12-15',
    readTime: '2 min'
  },
  {
    id: 'tip-3',
    title: 'Safe Human Foods',
    summary: 'Plain boiled chicken, carrots, and cucumbers are okay as treats. Never give onions, garlic, grapes, raisins, or chocolate.',
    category: 'Tips',
    region: 'Global',
    location: 'Global',
    source: 'PAWPHILE Nutrition',
    trustLabel: 'Manually reviewed',
    isVerified: true,
    publishedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    refreshCycle: 'Weekly',
    url: 'https://www.akc.org/expert-advice/nutrition/human-foods-dogs-can-and-cant-eat/',
    tags: ['food', 'safety', 'toxic'],
    date: '2023-11-20',
    readTime: '2 min'
  }
];

export const CURRENT_SEASONAL_ALERT: SeasonalAlert = {
  id: 'alert-summer-24',
  title: 'High Heat Alert',
  description: 'Temperatures are rising. Dogs do not sweat like humans and are at high risk for heatstroke.',
  severity: 'High',
  actions: [
    'Walk only before 8 AM or after 7 PM.',
    'Ensure fresh, cool water is always available.',
    'Check pavement temperature with your hand; if it is too hot for your hand for 5 seconds, it is too hot for paws.',
    'Never leave a dog in a parked car.'
  ]
};

export const ALL_PAWNEWS = [...CHENNAI_TODAY, ...INDIA_UPDATES, ...DOG_TIPS];
