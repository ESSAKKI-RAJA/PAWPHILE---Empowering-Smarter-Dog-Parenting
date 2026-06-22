/**
 * visionBodyAreas.ts
 * Typed configuration for all Vision Scan body areas.
 * All 13 required areas with metadata, red-flag questions, sensitivity flags, and fallback rules.
 */

export type VisionBodyAreaId =
  | 'skin_coat'
  | 'eyes'
  | 'ears'
  | 'paws_nails'
  | 'belly_underbody'
  | 'mouth_teeth_gums'
  | 'nose_snout'
  | 'tail_base_rear'
  | 'neck'
  | 'legs_posture'
  | 'injury_wound'
  | 'genitals_urinary'
  | 'other';

export type VisionSeverity = 'green' | 'yellow' | 'red';

export interface BodyAreaRedFlag {
  id: string;
  label: string;
  urgency: 'urgent' | 'warning';
}

export interface VisionBodyArea {
  id: VisionBodyAreaId;
  label: string;          // Display label
  shortLabel: string;     // For chips/grids
  emoji: string;
  description: string;    // What to look for
  requiresPrivacyConsent: boolean;  // For sensitive areas
  consentNote?: string;
  futureLabelNote?: string;   // "Video/gait analysis coming" etc.
  redFlags: BodyAreaRedFlag[];
  commonConcernTypes: string[];     // Dropdown options for "Concern Type"
  fallbackSeverity: VisionSeverity; // Default fallback if quality is poor
  fallbackDetectedConcern: string;
  fallbackWhatToWatch: string[];
  fallbackWhenToVisitVet: string;
  breedHighRiskTags: string[];      // Which commonRiskTags from breedKnowledge apply
}

export const VISION_BODY_AREAS: VisionBodyArea[] = [
  {
    id: 'skin_coat',
    label: 'Skin / Coat',
    shortLabel: 'Skin',
    emoji: '🐾',
    description: 'Look for redness, rash, bald patches, scales, lumps, dandruff, or dull coat.',
    requiresPrivacyConsent: false,
    redFlags: [
      { id: 'skin_spreading_rash', label: 'Spreading rash or lesions', urgency: 'warning' },
      { id: 'skin_deep_wound',     label: 'Open wound or deep sore', urgency: 'urgent' },
      { id: 'skin_hair_loss_rapid', label: 'Rapid widespread hair loss', urgency: 'warning' },
      { id: 'skin_swelling',        label: 'Swollen area with heat or pain', urgency: 'urgent' },
    ],
    commonConcernTypes: ['Itching / Scratching', 'Hair loss', 'Rash or redness', 'Lump or mass', 'Scabs or sores', 'Dull or dry coat', 'Dandruff', 'Other'],
    fallbackSeverity: 'yellow',
    fallbackDetectedConcern: 'Possible skin/coat change — screening signal only',
    fallbackWhatToWatch: ['Redness, swelling, or heat at affected area', 'Persistent scratching or biting at the spot', 'Rapid spread of lesions or hair loss'],
    fallbackWhenToVisitVet: 'See a vet if spreading, painful, infected, or not improving in 48–72 hours.',
    breedHighRiskTags: ['skin_allergies'],
  },
  {
    id: 'eyes',
    label: 'Eyes',
    shortLabel: 'Eyes',
    emoji: '👁️',
    description: 'Check for discharge, redness, cloudiness, swelling, squinting, or unequal pupils.',
    requiresPrivacyConsent: false,
    redFlags: [
      { id: 'eye_squinting',     label: 'Constant squinting or pawing at eye', urgency: 'urgent' },
      { id: 'eye_cloudy',        label: 'Sudden cloudiness or white film over eye', urgency: 'urgent' },
      { id: 'eye_prolapse',      label: 'Eye bulging or appears to have popped out', urgency: 'urgent' },
      { id: 'eye_bleeding',      label: 'Bleeding from or around the eye', urgency: 'urgent' },
    ],
    commonConcernTypes: ['Discharge (clear/yellow/green)', 'Redness', 'Cloudiness or white film', 'Squinting', 'Swelling', 'Third eyelid showing', 'Unequal pupils', 'Other'],
    fallbackSeverity: 'yellow',
    fallbackDetectedConcern: 'Possible eye irritation — screening signal only',
    fallbackWhatToWatch: ['Squinting, pawing at eye, discharge', 'Redness, cloudiness, or swelling', 'Third eyelid showing or pupils unequal size'],
    fallbackWhenToVisitVet: 'Same-day vet visit if squinting, severe redness, cloudiness, or eye appears bulging.',
    breedHighRiskTags: ['eye_risk'],
  },
  {
    id: 'ears',
    label: 'Ears',
    shortLabel: 'Ears',
    emoji: '👂',
    description: 'Look for redness inside the ear, dark wax buildup, odor, or head shaking.',
    requiresPrivacyConsent: false,
    redFlags: [
      { id: 'ear_bleeding',   label: 'Bleeding from the ear canal', urgency: 'urgent' },
      { id: 'ear_strong_odor', label: 'Very strong, foul odor from ear', urgency: 'warning' },
      { id: 'ear_severe_pain', label: 'Yelping in pain when ear touched', urgency: 'urgent' },
      { id: 'ear_balance',     label: 'Dog is tilting head or losing balance', urgency: 'urgent' },
    ],
    commonConcernTypes: ['Dark wax buildup', 'Redness inside ear', 'Scratching at ear', 'Head shaking', 'Odor', 'Discharge', 'Swelling', 'Other'],
    fallbackSeverity: 'yellow',
    fallbackDetectedConcern: 'Possible ear irritation — screening signal only',
    fallbackWhatToWatch: ['Head shaking, ear scratching, odor, dark/bloody wax', 'Redness, swelling, discharge from ear canal', 'Loss of balance or head tilt (inner ear concern)'],
    fallbackWhenToVisitVet: 'See a vet if odor, pain, discharge, or head tilt persists over 24 hours.',
    breedHighRiskTags: ['ear_infections'],
  },
  {
    id: 'paws_nails',
    label: 'Paws / Nails',
    shortLabel: 'Paws',
    emoji: '🐾',
    description: 'Check for redness between toes, cracked pads, broken nails, swelling, or limping.',
    requiresPrivacyConsent: false,
    redFlags: [
      { id: 'paw_broken_nail', label: 'Broken or torn nail with bleeding', urgency: 'urgent' },
      { id: 'paw_deep_cut',    label: 'Deep cut or wound on paw pad', urgency: 'urgent' },
      { id: 'paw_swelling',    label: 'Severe swelling of paw or toe', urgency: 'urgent' },
      { id: 'paw_cannot_walk', label: 'Dog refuses to put weight on paw', urgency: 'urgent' },
    ],
    commonConcernTypes: ['Licking paws excessively', 'Redness between toes', 'Cracked/dry pads', 'Broken or long nails', 'Swelling', 'Limping', 'Discharge', 'Other'],
    fallbackSeverity: 'yellow',
    fallbackDetectedConcern: 'Possible paw/nail concern — screening signal only',
    fallbackWhatToWatch: ['Licking or biting paws, redness between toes', 'Limping or favoring one leg', 'Swelling, heat, or discharge from paw'],
    fallbackWhenToVisitVet: 'See a vet if limping persists, deep wound present, or severe swelling.',
    breedHighRiskTags: [],
  },
  {
    id: 'belly_underbody',
    label: 'Belly / Underbody',
    shortLabel: 'Belly',
    emoji: '🐶',
    description: 'Look for distension, skin rash, spots, hernia, or sensitive areas on the belly.',
    requiresPrivacyConsent: false,
    redFlags: [
      { id: 'belly_distended', label: 'Belly appears swollen or distended', urgency: 'urgent' },
      { id: 'belly_hard',      label: 'Belly feels hard or tight', urgency: 'urgent' },
      { id: 'belly_pain',      label: 'Dog yelps when belly is touched', urgency: 'urgent' },
      { id: 'belly_breathing', label: 'Rapid or labored breathing alongside belly swelling', urgency: 'urgent' },
    ],
    commonConcernTypes: ['Rash or red spots', 'Swelling or bloating', 'Skin darkening', 'Lump or hernia-like bump', 'Hair loss on belly', 'Other'],
    fallbackSeverity: 'yellow',
    fallbackDetectedConcern: 'Possible belly/underbody concern — screening signal only',
    fallbackWhatToWatch: ['Distension (bloating), hard belly, or pain on touch', 'Rash, spots, or skin discoloration', 'Unusual lump or protrusion'],
    fallbackWhenToVisitVet: 'URGENT vet visit if belly appears swollen, hard, or dog is in pain — bloat is a life-threatening emergency.',
    breedHighRiskTags: ['bloat_risk'],
  },
  {
    id: 'mouth_teeth_gums',
    label: 'Mouth / Teeth / Gums',
    shortLabel: 'Mouth',
    emoji: '🦷',
    description: 'Check gum color (should be pink), breath odor, tartar buildup, broken teeth, or sores.',
    requiresPrivacyConsent: false,
    redFlags: [
      { id: 'gum_pale_blue',   label: 'Gums are pale, white, or blue/grey', urgency: 'urgent' },
      { id: 'gum_bleeding',    label: 'Bleeding gums or mouth', urgency: 'urgent' },
      { id: 'mouth_drooling_excess', label: 'Excessive drooling suddenly (suspected poisoning)', urgency: 'urgent' },
      { id: 'mouth_cannot_open', label: 'Dog cannot open or close mouth', urgency: 'urgent' },
    ],
    commonConcernTypes: ['Bad breath (halitosis)', 'Tartar buildup', 'Inflamed/bleeding gums', 'Broken or loose tooth', 'Sore or ulcer', 'Drooling', 'Other'],
    fallbackSeverity: 'yellow',
    fallbackDetectedConcern: 'Possible oral health concern — screening signal only',
    fallbackWhatToWatch: ['Gum color (should be pink, not pale/white/blue)', 'Bleeding, swelling, or bad odor', 'Reluctance to eat, pawing at mouth'],
    fallbackWhenToVisitVet: 'URGENT if gums are pale, white, or blue — see a vet immediately. Otherwise schedule a dental check-up.',
    breedHighRiskTags: ['dental_risk'],
  },
  {
    id: 'nose_snout',
    label: 'Nose / Snout',
    shortLabel: 'Nose',
    emoji: '👃',
    description: 'Look for discharge, crust, color changes, swelling, or breathing difficulty.',
    requiresPrivacyConsent: false,
    redFlags: [
      { id: 'nose_breathing_difficulty', label: 'Difficulty breathing or very labored breathing', urgency: 'urgent' },
      { id: 'nose_bloody_discharge',     label: 'Bloody discharge from nose', urgency: 'urgent' },
      { id: 'nose_severe_swelling',      label: 'Severe swelling of snout/face', urgency: 'urgent' },
    ],
    commonConcernTypes: ['Runny nose (clear discharge)', 'Yellow/green discharge', 'Crusty nose', 'Dry and cracked nose', 'Swelling', 'Sneezing frequently', 'Other'],
    fallbackSeverity: 'yellow',
    fallbackDetectedConcern: 'Possible nasal/snout concern — screening signal only',
    fallbackWhatToWatch: ['Nasal discharge (color and consistency)', 'Sneezing, pawing at nose', 'Breathing sounds or difficulty breathing'],
    fallbackWhenToVisitVet: 'See a vet if discharge is yellow/green/bloody, or breathing is labored.',
    breedHighRiskTags: ['brachycephalic_airway'],
  },
  {
    id: 'tail_base_rear',
    label: 'Tail Base / Rear',
    shortLabel: 'Tail/Rear',
    emoji: '🐕',
    description: 'Check for scooting, redness, swelling, discharge, or anal gland issues around the rear.',
    requiresPrivacyConsent: false,
    redFlags: [
      { id: 'tail_abscess',  label: 'Swollen, hot, or draining abscess near tail base', urgency: 'urgent' },
      { id: 'tail_bleeding', label: 'Bleeding from the anal area', urgency: 'urgent' },
    ],
    commonConcernTypes: ['Scooting (dragging rear on floor)', 'Redness or rash', 'Swelling near tail base', 'Discharge', 'Broken or injured tail', 'Other'],
    fallbackSeverity: 'green',
    fallbackDetectedConcern: 'No obvious concerns detected — screening signal only',
    fallbackWhatToWatch: ['Scooting, excessive licking of rear, redness', 'Swelling or discharge near anal area', 'Signs of anal gland discomfort'],
    fallbackWhenToVisitVet: 'See a vet if scooting persists, swelling is present, or discharge is noted.',
    breedHighRiskTags: [],
  },
  {
    id: 'neck',
    label: 'Neck',
    shortLabel: 'Neck',
    emoji: '🦮',
    description: 'Look for lumps, swelling, skin issues, collar rubbing, or pain on movement.',
    requiresPrivacyConsent: false,
    redFlags: [
      { id: 'neck_swelling_rapid', label: 'Rapid swelling of throat or neck area', urgency: 'urgent' },
      { id: 'neck_breathing',      label: 'Swelling affecting breathing', urgency: 'urgent' },
    ],
    commonConcernTypes: ['Lump or mass', 'Collar sore or rash', 'Stiffness or pain on touch', 'Swelling', 'Hair loss', 'Other'],
    fallbackSeverity: 'green',
    fallbackDetectedConcern: 'No obvious concerns detected — screening signal only',
    fallbackWhatToWatch: ['Lumps, swelling, or unusual growths on neck', 'Pain when touching neck or turning head', 'Collar-related skin damage'],
    fallbackWhenToVisitVet: 'See a vet if a new lump is found, swelling is increasing, or the dog has neck pain.',
    breedHighRiskTags: ['tracheal_risk'],
  },
  {
    id: 'legs_posture',
    label: 'Legs / Posture',
    shortLabel: 'Legs',
    emoji: '🦵',
    description: 'Check for limping, swelling, muscle loss, joint stiffness, or abnormal posture.',
    requiresPrivacyConsent: false,
    futureLabelNote: '🎥 Video/gait analysis coming — for now, upload a clear still image of the affected leg or posture.',
    redFlags: [
      { id: 'leg_cannot_walk',    label: 'Dog cannot stand or walk', urgency: 'urgent' },
      { id: 'leg_bone_visible',   label: 'Suspected fracture (visible deformity or bone)', urgency: 'urgent' },
      { id: 'leg_sudden_paralysis', label: 'Sudden hind-leg weakness or paralysis', urgency: 'urgent' },
    ],
    commonConcernTypes: ['Limping (one leg)', 'Stiffness after rest', 'Swollen joint', 'Muscle loss / one leg thinner', 'Abnormal posture', 'Collapse or weakness', 'Other'],
    fallbackSeverity: 'yellow',
    fallbackDetectedConcern: 'Possible limb/posture concern — screening signal only',
    fallbackWhatToWatch: ['Limping, favoring a leg, or reluctance to walk', 'Swollen or hot joints', 'Sudden hind-leg weakness in breeds predisposed to IVDD or hip dysplasia'],
    fallbackWhenToVisitVet: 'See a vet promptly if limping is consistent, or urgently if dog cannot walk or suspected fracture.',
    breedHighRiskTags: ['hip_dysplasia', 'joint_risk', 'ivdd_risk'],
  },
  {
    id: 'injury_wound',
    label: 'Injury / Wound',
    shortLabel: 'Wound',
    emoji: '🩹',
    description: 'Photograph any cut, bite, burn, abrasion, or open wound.',
    requiresPrivacyConsent: false,
    redFlags: [
      { id: 'wound_heavy_bleeding', label: 'Heavy or uncontrolled bleeding', urgency: 'urgent' },
      { id: 'wound_deep',           label: 'Deep puncture wound (bite or sharp object)', urgency: 'urgent' },
      { id: 'wound_infection',      label: 'Signs of infection (pus, severe swelling, odor)', urgency: 'warning' },
      { id: 'wound_burn',           label: 'Suspected burn (chemical or thermal)', urgency: 'urgent' },
    ],
    commonConcernTypes: ['Cut or laceration', 'Bite wound', 'Abrasion (scrape)', 'Burn', 'Surgical wound check', 'Abscess', 'Foreign object embedded', 'Other'],
    fallbackSeverity: 'red',
    fallbackDetectedConcern: 'Possible wound/injury — vet assessment recommended',
    fallbackWhatToWatch: ['Bleeding (controlled vs. uncontrolled)', 'Signs of infection: heat, swelling, pus, odor', 'Dog licking the wound excessively'],
    fallbackWhenToVisitVet: 'Urgent vet visit for any deep wound, uncontrolled bleeding, bite wounds, or signs of infection.',
    breedHighRiskTags: [],
  },
  {
    id: 'genitals_urinary',
    label: 'Genitals / Urinary Area',
    shortLabel: 'Urinary',
    emoji: '🔒',
    description: 'Look for discharge, swelling, redness, or signs of infection around the genital area.',
    requiresPrivacyConsent: true,
    consentNote: 'This scan area involves sensitive anatomy. Images are processed locally on your device and are not transmitted to external servers without your explicit consent.',
    redFlags: [
      { id: 'uro_bloody_discharge', label: 'Bloody discharge from genital area', urgency: 'urgent' },
      { id: 'uro_cannot_urinate',   label: 'Straining or unable to urinate', urgency: 'urgent' },
      { id: 'uro_swelling',         label: 'Significant swelling of genitals', urgency: 'urgent' },
    ],
    commonConcernTypes: ['Discharge (color)', 'Swelling or redness', 'Excessive licking', 'Straining to urinate', 'Blood in urine', 'Other'],
    fallbackSeverity: 'yellow',
    fallbackDetectedConcern: 'Possible urogenital concern — screening signal only',
    fallbackWhatToWatch: ['Discharge color and odor', 'Swelling, redness, or pain', 'Straining to urinate, frequent urination, blood in urine'],
    fallbackWhenToVisitVet: 'See a vet if straining to urinate, blood present, or unusual discharge is noted.',
    breedHighRiskTags: [],
  },
  {
    id: 'other',
    label: 'Other / Not Sure',
    shortLabel: 'Other',
    emoji: '❓',
    description: 'Upload an image of an area not listed above. Describe what you\'re concerned about in the notes.',
    requiresPrivacyConsent: false,
    redFlags: [
      { id: 'other_collapse', label: 'Dog collapsed or lost consciousness', urgency: 'urgent' },
      { id: 'other_seizure',  label: 'Dog is having a seizure', urgency: 'urgent' },
    ],
    commonConcernTypes: ['General check', 'Swelling in unknown area', 'Behavior change', 'Other concern'],
    fallbackSeverity: 'yellow',
    fallbackDetectedConcern: 'Unclassified concern — vet assessment recommended',
    fallbackWhatToWatch: ['Watch for worsening, spreading, or new symptoms', 'Note any behavior changes, appetite changes, or lethargy'],
    fallbackWhenToVisitVet: 'When in doubt, contact your veterinarian. Use the Triage tool for symptom-based guidance.',
    breedHighRiskTags: [],
  },
];

// ── Helper: lookup by ID ──────────────────────────────────────────────────────
export function getBodyArea(id: VisionBodyAreaId): VisionBodyArea {
  return VISION_BODY_AREAS.find(a => a.id === id) ?? VISION_BODY_AREAS[VISION_BODY_AREAS.length - 1];
}

// ── Helper: get areas matching breed risk tags ─────────────────────────────────
export function getHighRiskAreasForBreed(breedRiskTags: string[]): VisionBodyArea[] {
  return VISION_BODY_AREAS.filter(a =>
    a.breedHighRiskTags.some(tag => breedRiskTags.includes(tag))
  );
}
