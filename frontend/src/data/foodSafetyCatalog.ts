export type FoodSafetyCategory = 'safe' | 'moderate' | 'avoid' | 'toxic' | 'unknown';

export interface FoodEntry {
  name: string;
  aliases?: string[];
  category: FoodSafetyCategory;
  caloriesPer100g?: number;
  proteinG?: number;
  fatG?: number;
  carbsG?: number;
  warnings: string[];
  safeNote?: string;
  allergyRisk?: boolean;
  spiceRisk?: boolean;
  saltRisk?: boolean;
  sugarRisk?: boolean;
  oilRisk?: boolean;
  dairyRisk?: boolean;
  boneRisk?: boolean;
  infoSource?: string;
}

export const FOOD_CATALOG: FoodEntry[] = [
  // ── TOXIC FOODS ───────────────────────────────────────────
  {
    name: 'Chocolate',
    aliases: ['dark chocolate', 'milk chocolate', 'cocoa', 'cacao'],
    category: 'toxic',
    caloriesPer100g: 546,
    warnings: ['Contains theobromine and caffeine — toxic to dogs.', 'Even small amounts can cause vomiting, seizures, or death.', 'Dark chocolate is more dangerous than milk chocolate.'],
  },
  {
    name: 'Grapes',
    aliases: ['raisins', 'sultanas', 'currants', 'dried grapes'],
    category: 'toxic',
    caloriesPer100g: 69,
    warnings: ['Can cause acute kidney failure in dogs.', 'Even a small quantity can be fatal.', 'The exact toxic compound is unknown — any amount is unsafe.'],
  },
  {
    name: 'Onion',
    aliases: ['garlic', 'onions', 'garlic powder', 'onion powder', 'leeks', 'chives', 'shallots'],
    category: 'toxic',
    caloriesPer100g: 40,
    warnings: ['Contains N-propyl disulfide — destroys red blood cells.', 'Causes hemolytic anemia, even in small cooked amounts.', 'Garlic is 5x more toxic than onion by weight.'],
    spiceRisk: true,
  },
  {
    name: 'Xylitol',
    aliases: ['artificial sweetener', 'sugar-free gum', 'stevia (check label)'],
    category: 'toxic',
    warnings: ['Causes insulin spike leading to hypoglycemia.', 'Can cause acute liver failure.', 'Found in sugar-free peanut butter, gums, candies, and some medicines.'],
    sugarRisk: true,
  },
  {
    name: 'Alcohol',
    aliases: ['beer', 'wine', 'spirits', 'rum', 'whiskey', 'ethanol'],
    category: 'toxic',
    warnings: ['Dogs metabolize alcohol much faster than humans.', 'Causes vomiting, breathing difficulties, coma, and death.'],
  },
  {
    name: 'Caffeine',
    aliases: ['coffee', 'tea', 'green tea', 'energy drinks', 'cola'],
    category: 'toxic',
    warnings: ['Contains methylxanthines — toxic to dogs.', 'Causes rapid breathing, seizures, and heart problems.'],
  },
  {
    name: 'Cooked Bones',
    aliases: ['cooked chicken bones', 'cooked fish bones', 'cooked pork bones'],
    category: 'toxic',
    warnings: ['Cooked bones splinter and can puncture intestines.', 'Raw bones are safer but always supervise.', 'Never give cooked chicken, pork, or fish bones.'],
    boneRisk: true,
  },
  {
    name: 'Macadamia Nuts',
    aliases: ['macadamia'],
    category: 'toxic',
    caloriesPer100g: 718,
    warnings: ['Causes weakness, hyperthermia, vomiting, and tremors.', 'Even 1-2 nuts per kg of body weight can cause toxicity.'],
  },
  {
    name: 'Avocado',
    aliases: ['guacamole'],
    category: 'toxic',
    warnings: ['Contains persin — toxic to dogs, especially the pit and skin.', 'Can cause vomiting, diarrhea, and myocardial damage.'],
  },

  // ── INDIAN FOODS — AVOID ─────────────────────────────────
  {
    name: 'Spicy Curry',
    aliases: ['curry', 'masala', 'spicy food', 'biryani masala'],
    category: 'avoid',
    caloriesPer100g: 150,
    warnings: ['Spices (chili, pepper, cumin) irritate the GI tract.', 'Onion and garlic in curry are toxic to dogs.', 'High oil content causes pancreatitis risk.'],
    spiceRisk: true, oilRisk: true,
  },
  {
    name: 'Biryani',
    aliases: ['chicken biryani', 'mutton biryani', 'rice biryani'],
    category: 'avoid',
    caloriesPer100g: 180,
    warnings: ['Contains onion, garlic, and spices — all toxic/irritating.', 'High salt and oil content.'],
    spiceRisk: true, saltRisk: true, oilRisk: true,
  },
  {
    name: 'Sweets',
    aliases: ['gulab jamun', 'jalebi', 'laddu', 'barfi', 'halwa', 'indian sweets'],
    category: 'avoid',
    caloriesPer100g: 380,
    warnings: ['Extremely high in sugar — leads to obesity and dental disease.', 'Some may contain xylitol (artificial sweetener) — highly toxic.', 'Milk-based sweets cause digestive upset in lactose-intolerant dogs.'],
    sugarRisk: true, dairyRisk: true,
  },
  {
    name: 'Fried Snacks',
    aliases: ['samosa', 'pakora', 'vada', 'chips', 'bhujia', 'namkeen', 'fries'],
    category: 'avoid',
    caloriesPer100g: 450,
    warnings: ['Very high in oil and salt — pancreatitis risk.', 'Spiced varieties contain onion/garlic powder.', 'No nutritional benefit for dogs.'],
    saltRisk: true, oilRisk: true, spiceRisk: true,
  },
  {
    name: 'Biscuits',
    aliases: ['parle-g', 'cookies', 'crackers', 'marie biscuits'],
    category: 'avoid',
    caloriesPer100g: 420,
    warnings: ['High sugar and salt content.', 'Some contain vanilla extract (alcohol-based) — toxic.', 'No nutritional benefit; empty calories.'],
    sugarRisk: true, saltRisk: true,
  },

  // ── MODERATE / SAFE WITH CAUTION ─────────────────────────
  {
    name: 'Plain Rice',
    aliases: ['white rice', 'cooked rice', 'basmati rice', 'steamed rice'],
    category: 'moderate',
    caloriesPer100g: 130,
    proteinG: 2.7, fatG: 0.3, carbsG: 28,
    warnings: ['Safe in moderation when plain (no salt, spice, or oil).', 'High glycemic index — avoid in diabetic or obese dogs.', 'Good for upset stomach when combined with boiled chicken.'],
    safeNote: 'Plain boiled rice is a common vet-recommended bland diet for GI issues.',
  },
  {
    name: 'Curd Rice',
    aliases: ['dahi rice', 'curd', 'yogurt rice'],
    category: 'moderate',
    caloriesPer100g: 110,
    proteinG: 3.5, fatG: 1.5, carbsG: 20,
    warnings: ['Plain, unsweetened curd is generally safe in small amounts.', 'Many dogs are lactose intolerant — watch for diarrhea.', 'Do NOT feed if spiced or salted.'],
    dairyRisk: true,
    safeNote: 'Plain curd (no spice/salt) may be given as an occasional small treat.',
  },
  {
    name: 'Milk',
    aliases: ['cow milk', 'full-fat milk', 'buffalo milk'],
    category: 'moderate',
    caloriesPer100g: 65,
    proteinG: 3.2, fatG: 3.5, carbsG: 4.8,
    warnings: ['Many dogs are lactose intolerant — causes diarrhea.', 'High fat content can cause pancreatitis.', 'If your dog tolerates dairy, very small amounts only.'],
    dairyRisk: true,
  },
  {
    name: 'Paneer',
    aliases: ['cottage cheese', 'Indian cottage cheese'],
    category: 'moderate',
    caloriesPer100g: 265,
    proteinG: 18, fatG: 20, carbsG: 1.2,
    warnings: ['High in fat — excessive amounts cause pancreatitis.', 'May cause digestive issues in lactose-intolerant dogs.', 'Plain paneer only — no spices, salt, or masala.'],
    dairyRisk: true,
    safeNote: 'A small plain paneer cube occasionally as a treat is generally tolerated.',
  },
  {
    name: 'Chapati',
    aliases: ['roti', 'phulka', 'flatbread', 'wheat roti'],
    category: 'moderate',
    caloriesPer100g: 297,
    proteinG: 8, fatG: 3, carbsG: 56,
    warnings: ['Plain chapati (no oil/salt/butter) is generally safe in moderation.', 'High in carbohydrates — avoid for obese or diabetic dogs.', 'Some dogs have wheat/gluten sensitivity.'],
    safeNote: 'One small plain chapati piece occasionally is generally fine.',
    allergyRisk: true,
  },
  {
    name: 'Idli',
    aliases: ['idly', 'steamed idli'],
    category: 'moderate',
    caloriesPer100g: 58,
    proteinG: 2.1, fatG: 0.3, carbsG: 11.7,
    warnings: ['Plain idli is relatively safe in small amounts.', 'Do not feed with sambar (contains onion/garlic) or chutney (spiced).', 'High carbohydrate content — use sparingly.'],
    safeNote: 'Plain idli without accompaniments is one of the safer Indian grain foods for dogs.',
  },
  {
    name: 'Dosa',
    aliases: ['plain dosa', 'masala dosa'],
    category: 'moderate',
    caloriesPer100g: 168,
    proteinG: 4, fatG: 4, carbsG: 28,
    warnings: ['Plain dosa (no masala filling) is moderately safe.', 'Masala dosa contains potato with spices — avoid.', 'Cooked with too much oil — causes GI upset.'],
    oilRisk: true,
  },
  {
    name: 'Dal',
    aliases: ['lentil soup', 'toor dal', 'moong dal', 'lentils'],
    category: 'moderate',
    caloriesPer100g: 116,
    proteinG: 9, fatG: 0.4, carbsG: 20,
    warnings: ['Plain boiled lentils are safe and high in protein.', 'Tempered dal with onion, garlic, and spices is NOT safe.', 'Gas and bloating possible — introduce slowly.'],
    safeNote: 'Plain boiled lentils are a good plant protein source for dogs.',
  },

  // ── SAFE FOODS ────────────────────────────────────────────
  {
    name: 'Boiled Chicken',
    aliases: ['plain chicken', 'chicken breast', 'steamed chicken', 'chicken rice'],
    category: 'safe',
    caloriesPer100g: 165,
    proteinG: 31, fatG: 3.6, carbsG: 0,
    warnings: ['No bones, no skin, no seasoning.', 'High-protein, low-fat — excellent for dogs.'],
    safeNote: 'Plain boiled chicken is one of the best foods for dogs, especially during illness.',
  },
  {
    name: 'Boiled Egg',
    aliases: ['egg', 'scrambled egg', 'hard boiled egg'],
    category: 'safe',
    caloriesPer100g: 155,
    proteinG: 13, fatG: 11, carbsG: 1.1,
    warnings: ['No salt, butter, or oil.', 'Raw eggs carry Salmonella risk — always cook thoroughly.', 'One egg per day for medium dogs; half for small dogs.'],
    safeNote: 'Cooked eggs are an excellent protein and biotin source for dogs.',
  },
  {
    name: 'Chicken Rice',
    aliases: ['chicken and rice', 'boiled chicken with rice'],
    category: 'safe',
    caloriesPer100g: 148,
    proteinG: 12, fatG: 2, carbsG: 20,
    warnings: ['Only if both components are plain and cooked.', 'The standard vet-recommended bland diet for GI recovery.'],
    safeNote: 'The go-to home remedy for dogs with upset stomachs.',
  },
  {
    name: 'Pumpkin',
    aliases: ['plain pumpkin', 'cooked pumpkin', 'pumpkin puree'],
    category: 'safe',
    caloriesPer100g: 26,
    proteinG: 1, fatG: 0.1, carbsG: 6.5,
    warnings: ['Canned pumpkin must be plain, not pie filling (contains xylitol/spices).'],
    safeNote: 'Excellent source of fiber — helps with both diarrhea and constipation.',
  },
  {
    name: 'Sweet Potato',
    aliases: ['shakarkandi', 'cooked sweet potato'],
    category: 'safe',
    caloriesPer100g: 86,
    proteinG: 1.6, fatG: 0.1, carbsG: 20,
    warnings: ['Plain cooked only — no butter, salt, or spices.', 'High in carbohydrates — give in moderation to overweight dogs.'],
    safeNote: 'Rich in fiber, vitamins A and C. Good for digestive health.',
  },
  {
    name: 'Carrot',
    aliases: ['raw carrot', 'cooked carrot', 'baby carrot'],
    category: 'safe',
    caloriesPer100g: 41,
    proteinG: 0.9, fatG: 0.2, carbsG: 9.6,
    warnings: ['Whole raw carrots can be a choking hazard for small dogs — chop first.'],
    safeNote: 'Great low-calorie snack. Good for dental health when chewed raw.',
  },
  {
    name: 'Watermelon',
    aliases: ['tarbuj', 'seedless watermelon'],
    category: 'safe',
    caloriesPer100g: 30,
    proteinG: 0.6, fatG: 0.2, carbsG: 7.6,
    warnings: ['Remove seeds — intestinal blockage risk.', 'Remove the rind — difficult to digest.', 'High water content — great for hydration.'],
    safeNote: 'Excellent cooling summer treat for dogs, especially breeds sensitive to heat.',
  },
  {
    name: 'Banana',
    aliases: ['kela', 'ripe banana'],
    category: 'safe',
    caloriesPer100g: 89,
    proteinG: 1.1, fatG: 0.3, carbsG: 23,
    warnings: ['High in sugar and potassium — give in moderation.', 'Small dogs: only a few small pieces.', 'Do not feed the peel.'],
    safeNote: 'Good as a rare treat. High in potassium, vitamin B6, and fiber.',
  },
  {
    name: 'Apple',
    aliases: ['seb', 'apples'],
    category: 'safe',
    caloriesPer100g: 52,
    proteinG: 0.3, fatG: 0.2, carbsG: 13.8,
    warnings: ['Remove seeds and core — seeds contain cyanide compounds.', 'Peel if possible for easier digestion.'],
    safeNote: 'Good source of vitamins A and C. Fresh and crunchy — most dogs love it.',
  },
  {
    name: 'Coconut',
    aliases: ['nariyal', 'coconut water', 'coconut flesh', 'desiccated coconut'],
    category: 'moderate',
    caloriesPer100g: 354,
    proteinG: 3.3, fatG: 33, carbsG: 15,
    warnings: ['High fat content — too much causes pancreatitis.', 'Coconut water is hydrating but high in potassium.', 'Avoid packaged coconut with added sugar or preservatives.'],
    safeNote: 'Small amounts of fresh coconut flesh are generally safe and may support skin health.',
  },
];

// ── Helper: search the catalog ─────────────────────────────────────────────
export function searchFoodCatalog(query: string): FoodEntry | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  return FOOD_CATALOG.find(f =>
    f.name.toLowerCase().includes(q) ||
    (f.aliases || []).some(a => a.toLowerCase().includes(q))
  ) || null;
}

export function getCategoryStyle(category: FoodSafetyCategory) {
  switch (category) {
    case 'safe':    return { label: 'Safe', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.30)' };
    case 'moderate': return { label: 'Safe in Moderation', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.30)' };
    case 'avoid':   return { label: 'Avoid', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.30)' };
    case 'toxic':   return { label: 'Dangerous / Toxic', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.30)' };
    default:        return { label: 'Unknown — Check Vet', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.30)' };
  }
}
