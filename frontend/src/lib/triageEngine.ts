/**
 * PAWAI Triage Engine — deterministic, rule-based severity scoring.
 *
 * Medical references:
 * - MSD/Merck Veterinary Manual (emergency & first-aid guidance)
 * - AVMA household hazard and poisoning guidance
 * - ASPCA Animal Poison Control toxic food/plant references
 * - WSAVA pain recognition guidelines
 * - AAHA canine life-stage preventive care guidelines
 *
 * IMPORTANT: This engine provides GUIDANCE ONLY.
 * It does NOT diagnose, prescribe, or replace veterinary examination.
 */
import { TriageInput, TriageResult, TriageSeverity } from '../types/triage';

// ─── Keyword lists ────────────────────────────────────────────────────────────

/** Signs that indicate a potential veterinary emergency (RED) */
const EMERGENCY_KEYWORDS = [
  'breathing difficulty', 'cannot breathe', 'struggling to breathe',
  'seizure', 'collapse', 'collapsed', 'unconscious', 'unresponsive',
  'heavy bleeding', 'severe bleeding',
  'blood vomiting', 'vomiting blood', 'bloody vomit',
  'bloody diarrhea', 'blood in stool',
  'pale gums', 'white gums', 'blue gums', 'grey gums',
  'bloated belly', 'distended abdomen', 'stomach bloat',
  'retching without vomiting',
  'poisoning', 'toxin', 'toxic', 'swallowed', 'ingested',
  'chocolate', 'rat poison', 'xylitol', 'grapes', 'onion', 'garlic', 'raisin',
  'snake bite', 'bee sting severe',
  'severe injury', 'hit by car', 'trauma',
  'unable to stand', 'cannot stand',
  'extreme weakness', 'completely limp',
  'parvo', 'parvovirus',
  'difficulty urinating', 'cannot urinate', 'straining to urinate',
  'jaundice',
];

/** Signs suggesting moderate concern (ORANGE) */
const MODERATE_KEYWORDS = [
  'vomiting', 'vomited', 'vomits',
  'diarrhea', 'loose stool', 'watery stool',
  'fever', 'temperature high', 'warm to touch',
  'loss of appetite', 'not eating', 'refused food',
  'limping', 'lame', 'not putting weight',
  'skin infection', 'hot spot', 'pyoderma',
  'ear infection', 'ear odor', 'brown discharge ear',
  'eye discharge', 'eye pain', 'squinting',
  'persistent coughing', 'coughing up', 'gagging',
  'lethargy', 'lethargic', 'tired', 'low energy',
  'dehydration', 'sunken eyes', 'dry gums',
  'tick exposure', 'tick bite',
  'head shaking',
  'swollen', 'swelling',
  'mucus in stool', 'blood in stool',
];

/** Mild / low-priority signs (GREEN) */
const MILD_KEYWORDS = [
  'mild itching', 'occasional scratching',
  'minor appetite change', 'slightly less hungry',
  'minor stool change', 'slightly soft stool',
  'mild dandruff', 'dry skin',
  'minor tiredness', 'slightly less active',
  'sneezing occasionally',
];

function matchKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter(kw => lower.includes(kw));
}

// ─── Possible cause mapping ───────────────────────────────────────────────────

function buildPossibleCauses(
  symptomsText: string,
  input: TriageInput,
  emergencyHits: string[],
  moderateHits: string[],
): string[] {
  const causes: string[] = [];

  if (input.toxinExposure) causes.push('Possible toxin or chemical exposure (urgent — call vet or animal poison control)');
  if (emergencyHits.some(k => k.includes('parvo'))) causes.push('Possible Parvovirus infection (highly contagious — requires immediate vet care)');
  if (emergencyHits.some(k => ['bloat', 'distend', 'retching'].some(x => k.includes(x)))) causes.push('Possible gastric dilatation-volvulus (GDV / bloat) — life-threatening if not treated immediately');
  if (emergencyHits.some(k => ['pale gum', 'white gum', 'blue gum'].some(x => k.includes(x)))) causes.push('Possible internal bleeding, shock, or severe anaemia — emergency assessment required');
  if (emergencyHits.some(k => k.includes('seizure'))) causes.push('Possible seizure disorder, toxin ingestion, or neurological emergency');
  if (emergencyHits.some(k => ['cannot urinate', 'difficulty urinating', 'straining to urinate'].some(x => k.includes(x)))) causes.push('Possible urinary blockage — critical in male dogs');

  if (symptomsText.includes('vomit') || symptomsText.includes('diarrhea') || moderateHits.some(k => k.includes('stool'))) {
    causes.push('Gastrointestinal upset (dietary indiscretion, food intolerance, or infection)');
  }
  if (input.recentDietChange) causes.push('Recent diet change may be causing digestive upset');
  if (input.tickExposure) causes.push('Tick-borne disease (e.g., Ehrlichiosis, Babesiosis, Lyme) — higher risk in India during monsoon');

  const isUnvaccinated = input.vaccinationStatus === 'Not Vaccinated' || input.vaccinationStatus === 'Partially Vaccinated' || input.vaccinationStatus === 'Not Sure';
  const hasInfectiousSigns = symptomsText.includes('vomit') || symptomsText.includes('diarrhea') || symptomsText.includes('fever') || symptomsText.includes('letharg');
  if (isUnvaccinated && hasInfectiousSigns) {
    causes.push('Possible viral illness (Parvovirus, Distemper) — risk elevated in unvaccinated/partially vaccinated dogs');
  }

  if (moderateHits.some(k => k.includes('ear'))) causes.push('Possible otitis externa (ear infection) — often bacterial or yeast-related');
  if (moderateHits.some(k => k.includes('skin') || k.includes('itching') || k.includes('hot spot'))) causes.push('Possible skin infection, allergy, or parasitic infestation');
  if (moderateHits.some(k => k.includes('limp') || k.includes('lame'))) causes.push('Possible joint injury, paw pad injury, or musculoskeletal issue');
  if (moderateHits.some(k => k.includes('cough') || k.includes('gagging'))) causes.push('Possible kennel cough, respiratory infection, or foreign body');

  if (causes.length === 0) causes.push('Mild or self-resolving condition — monitor closely for any progression');

  return causes;
}

// ─── Home care guidance ───────────────────────────────────────────────────────

function buildHomeCare(severity: TriageSeverity): string[] {
  if (severity === 'red') {
    return [
      'Keep your dog calm and restrict movement',
      'Do NOT give food, water, or any medications until assessed by a vet',
      'Go to the nearest emergency animal hospital immediately',
      'If poisoning is suspected: call your vet or ASPCA Animal Poison Control — do not induce vomiting without professional guidance',
      'Call ahead to the emergency clinic so they can prepare',
    ];
  }
  if (severity === 'orange') {
    return [
      'Contact your veterinarian today or within 24 hours',
      'Monitor and log symptoms every 2–3 hours',
      'Ensure fresh water is always available',
      'Offer bland food only if appetite loss is mild (plain boiled rice + chicken, no seasoning)',
      'Do NOT give human medications (paracetamol, ibuprofen — these are toxic to dogs)',
      'Keep the dog in a calm, comfortable environment away from stress',
    ];
  }
  return [
    'Monitor your dog closely for the next 24–48 hours',
    'Ensure access to fresh, clean water at all times',
    'Keep a simple symptom log to share with your vet at the next visit',
    'Avoid known dietary triggers or environmental allergens',
    'If symptoms worsen or new symptoms appear, contact your veterinarian',
  ];
}

// ─── Warning signs ────────────────────────────────────────────────────────────

const WARNING_SIGNS_UNIVERSAL = [
  'Breathing becomes laboured, rapid, or noisy',
  'Gums turn pale, white, blue, or grey',
  'Dog collapses, loses consciousness, or cannot stand',
  'Seizures, tremors, or uncontrolled muscle movements',
  'Repeated vomiting (more than 3 times) or blood in vomit',
  'Visible pain, crying, or extreme restlessness',
  'Complete refusal of food and water for more than 12 hours',
  'Abdomen appears bloated or feels rigid',
];

// ─── Prevention tips ──────────────────────────────────────────────────────────

const PREVENTION_TIPS = [
  'Keep all core vaccinations current — consult your vet for a schedule appropriate for your region (AAHA/WSAVA guidelines)',
  'Apply monthly flea, tick, and heartworm preventives year-round in tropical/monsoon climates',
  'Keep household toxins, human foods (chocolate, grapes, onions, xylitol), and medications out of reach',
  'Maintain consistent diet — avoid sudden food changes; transition over 7–10 days',
  'Schedule regular wellness check-ups: annually for adult dogs, biannually for seniors (7+ years)',
  'Deworm every 3 months or as recommended by your veterinarian',
];

// ─── Main engine ──────────────────────────────────────────────────────────────

export function analyzeDogTriage(input: TriageInput): TriageResult {
  const symptomsText = [
    input.symptoms,
    ...input.selectedSymptoms,
  ].join(' ').toLowerCase();

  const emergencyHits = matchKeywords(symptomsText, EMERGENCY_KEYWORDS);
  const moderateHits = matchKeywords(symptomsText, MODERATE_KEYWORDS);
  const mildHits = matchKeywords(symptomsText, MILD_KEYWORDS);

  let score = 0;
  score += emergencyHits.length * 10;
  score += moderateHits.length * 3;
  score += mildHits.length * 1;

  // Risk multipliers
  if (input.toxinExposure) score += 15;
  if (input.tickExposure) score += 4;

  const isUnvaccinated = ['Not Vaccinated', 'Partially Vaccinated', 'Not Sure'].includes(input.vaccinationStatus);
  const hasInfectiousSigns = ['vomit', 'diarrhea', 'fever', 'letharg'].some(k => symptomsText.includes(k));
  if (isUnvaccinated && hasInfectiousSigns) score += 6;

  // Duration escalation
  if (input.duration === 'More than 3 days' || input.duration === 'Repeated / Chronic') score += 6;
  else if (input.duration === '1–3 days') score += 3;
  else if (input.duration === '6–24 hours') score += 1;

  // Age risk
  const ageLower = input.age.toLowerCase();
  const isPuppy = ageLower.includes('month') || ageLower.includes('week') || ageLower.includes('puppy');
  const isSenior = ageLower.includes('year') && parseInt(ageLower) >= 8;
  if (isPuppy && hasInfectiousSigns) score += 5;
  if (isSenior && (input.duration === '1–3 days' || input.duration === 'More than 3 days')) score += 4;

  // Severity classification
  let severity: TriageSeverity = 'green';
  if (emergencyHits.length > 0 || input.toxinExposure || score >= 12) {
    severity = 'red';
  } else if (score >= 5 || moderateHits.length >= 2) {
    severity = 'orange';
  }

  const titles: Record<TriageSeverity, string> = {
    red: '🚨 Possible Emergency — Seek Immediate Veterinary Care',
    orange: '⚠️ Concerning Symptoms — Contact Your Vet Soon',
    green: '✅ Low Concern — Monitor at Home',
  };

  const summaries: Record<TriageSeverity, string> = {
    red: 'The symptoms reported suggest a potentially serious or life-threatening condition. Do not delay — go to an emergency veterinary clinic immediately. This assessment does not constitute a diagnosis.',
    orange: 'Your dog is showing symptoms that warrant veterinary attention within 24 hours. These signs may indicate an underlying condition that needs professional evaluation. Do not self-medicate.',
    green: 'The reported symptoms appear mild at this stage. Most mild conditions resolve with rest and monitoring. Watch closely for any worsening and consult your vet if symptoms persist beyond 48 hours.',
  };

  const nextSteps: Record<TriageSeverity, string> = {
    red: 'Go to the nearest emergency animal hospital now. Call ahead if possible.',
    orange: 'Contact your veterinarian and schedule an appointment today or within 24 hours.',
    green: 'Monitor your dog for 24–48 hours. Log any changes. Contact your vet if symptoms worsen or persist.',
  };

  const confidence = Math.min(97, 65 + Math.min(score * 2, 30));

  let sourcesUsed: string[] = [];
  const sourceTagsSet = new Set<string>();

  if (severity === 'red') {
    sourcesUsed = ["MSD/Merck Veterinary Manual", "AVMA", "ASPCA"];
  } else if (severity === 'orange') {
    sourcesUsed = ["MSD/Merck Veterinary Manual", "AAHA", "WSAVA"];
  } else {
    sourcesUsed = ["AAHA", "WSAVA"];
  }

  const hasPoisoning = input.toxinExposure || ['poison', 'toxin', 'chocolate', 'xylitol', 'grapes', 'raisin', 'onion', 'garlic', 'medicine', 'chemical'].some(k => symptomsText.includes(k));
  if (hasPoisoning) sourceTagsSet.add("ASPCA Animal Poison Control");

  if (emergencyHits.length > 0) {
    sourceTagsSet.add("MSD/Merck Veterinary Manual");
    sourceTagsSet.add("AVMA");
  }

  if (['pain', 'limp', 'discomfort', 'lame'].some(k => symptomsText.includes(k))) {
    sourceTagsSet.add("WSAVA");
  }

  if (isUnvaccinated || ['vaccin', 'prevent'].some(k => symptomsText.includes(k))) {
    sourceTagsSet.add("AAHA");
    sourceTagsSet.add("WSAVA");
  }

  // Ensure at least one tag is present based on severity if specific rules don't hit
  if (sourceTagsSet.size === 0) {
    sourcesUsed.forEach(s => sourceTagsSet.add(s));
  }

  return {
    severity,
    severityLabel: severity === 'red' ? 'High / Emergency' : severity === 'orange' ? 'Moderate / See Vet Soon' : 'Low / Monitor at Home',
    title: titles[severity],
    summary: summaries[severity],
    possibleCauses: buildPossibleCauses(symptomsText, input, emergencyHits, moderateHits),
    homeCare: buildHomeCare(severity),
    warningSigns: WARNING_SIGNS_UNIVERSAL,
    preventionTips: PREVENTION_TIPS,
    confidence,
    nextStep: nextSteps[severity],
    isEmergency: severity === 'red',
    sourceCategory: 'triage',
    sourcesUsed,
    sourceTags: Array.from(sourceTagsSet),
    sourceNote: "This triage result is based on symptom risk patterns and veterinary reference categories. It is not a diagnosis and does not replace a veterinarian."
  };
}
