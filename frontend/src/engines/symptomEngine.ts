import { SymptomLog, DogProfile, TriageResult } from '../types/pawphile';

export function analyzeSymptoms(log: SymptomLog, profile: DogProfile): TriageResult {
  let severity: 'red' | 'yellow' | 'green' = 'green';
  const reasons: string[] = [];
  const whatToMonitor: string[] = [];
  let whatToDoNow = 'Monitor at home.';
  let whenToGoToVet = 'If symptoms worsen.';
  let escalationTriggered = false;

  const isEmergency =
    log.energyLevel === 'collapsed' ||
    log.energyLevel === 'disoriented' ||
    log.energyLevel === 'weak' ||
    log.breathingStatus === 'labored' ||
    log.breathingStatus === 'fast' ||
    log.gumColor === 'blue' ||
    log.gumColor === 'white' ||
    log.vomitingBlood ||
    log.diarrheaBlood ||
    log.mainConcern.toLowerCase().includes('seizure') ||
    log.mainConcern.toLowerCase().includes('collapse') ||
    log.mainConcern.toLowerCase().includes('choking') ||
    log.mainConcern.toLowerCase().includes('heatstroke') ||
    (log.mainConcern.toLowerCase().includes('belly') && log.mainConcern.toLowerCase().includes('swollen')) ||
    log.toxinExposure;

  if (isEmergency) {
    severity = 'red';
    escalationTriggered = true;
    whenToGoToVet = 'IMMEDIATELY - THIS IS A VETERINARY EMERGENCY';
    whatToDoNow = 'Do NOT offer food or water. Call the emergency vet clinic to let them know you are coming, and transport the dog safely immediately.';
    reasons.push('Critical emergency signs detected (e.g. collapse, labored breathing, bleeding, suspected bloat/GDV, or heatstroke).');
    if (log.toxinExposure) reasons.push('Possible toxin/poison exposure requires immediate vet intervention.');
    if (profile.age && profile.age < 1) reasons.push('Puppies deteriorate very quickly; any emergency sign is highly critical.');
  } else if (
    (log.vomitingCount && log.vomitingCount > 2) ||
    (log.diarrheaFrequency && log.diarrheaFrequency > 2) ||
    log.energyLevel === 'lethargic' ||
    log.appetiteStatus === 'refused' ||
    log.waterIntake === 'unable' ||
    (log.temperatureValue && (log.temperatureValue > 103.5 || log.temperatureValue < 99)) ||
    (profile.age && profile.age < 1 && (log.vomitingCount || log.diarrheaFrequency))
  ) {
    severity = 'yellow';
    whenToGoToVet = 'Within 12-24 hours (sooner if condition declines)';
    whatToDoNow = 'Withhold food for 12 hours. Offer small amounts of water frequently to prevent dehydration. Do NOT give human medications.';
    reasons.push('Multiple or persistent symptoms detected that require veterinary evaluation.');
    if (profile.age && profile.age < 1) reasons.push('Puppies with vomiting/diarrhea are at high risk for Parvovirus and rapid dehydration.');
    whatToMonitor.push('Energy level', 'Ability to hold down water', 'Further vomiting/diarrhea');
  } else {
    severity = 'green';
    whenToGoToVet = 'Monitor for 48 hours, contact a vet if symptoms persist.';
    whatToDoNow = 'Ensure access to fresh water. Monitor appetite and energy levels.';
    reasons.push('No emergency signs were identified. Symptoms appear mild.');
    whatToMonitor.push('Appetite', 'Energy level', 'Progression of current concern');
  }

  // Safety override - when uncertainty is high
  const missingData = [];
  if (log.appetiteStatus === 'unknown') missingData.push('Appetite status');
  if (log.gumColor === 'unknown') missingData.push('Gum color');

  const confidenceScore = missingData.length > 1 ? 40 : (missingData.length === 1 ? 70 : 95);
  const confidence = confidenceScore > 80 ? 'high' : (confidenceScore > 50 ? 'medium' : 'low');

  if (confidence === 'low' && severity === 'green') {
    severity = 'yellow';
    reasons.push('Insufficient data to confidently rule out serious issues.');
    whatToDoNow = 'Due to missing information, monitor closely and consult a vet if you are unsure or if any symptom worsens.';
  }

  // Breed-specific risk modifiers (Triage)
  if (profile.breed) {
    const b = profile.breed.toLowerCase();
    if ((b.includes('pug') || b.includes('bulldog') || b.includes('boxer')) && log.breathingStatus === 'labored') {
      severity = 'red';
      reasons.push('Brachycephalic breeds are at extreme risk during respiratory distress or heatstroke.');
      whenToGoToVet = 'IMMEDIATELY - THIS IS A VETERINARY EMERGENCY';
      whatToDoNow = 'Keep the dog cool and calm. Transport to the vet immediately.';
    }
    if ((b.includes('great dane') || b.includes('shepherd') || b.includes('labrador')) && log.mainConcern.toLowerCase().includes('belly')) {
      severity = 'red';
      reasons.push('Large, deep-chested breeds with a swollen belly and/or retching are at high risk for fatal GDV (Bloat).');
      whenToGoToVet = 'IMMEDIATELY - THIS IS A VETERINARY EMERGENCY';
    }
  }

  return {
    id: `trg_${Date.now()}`,
    dogId: profile.id,
    symptomLogId: log.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'ai',
    syncStatus: 'local_only',
    severity,
    confidence,
    confidenceScore,
    reasons,
    dataUsed: ['Symptom Log', 'Dog Profile Age/Breed'],
    missingData,
    whatToDoNow,
    whatToMonitor,
    whenToGoToVet,
    escalationTriggered,
    disclaimer: "This is not a diagnosis. PAWPHILE is a decision-support tool. Please consult a veterinarian if you have any concerns about your dog's health.",
    ruleVersion: '1.0.0',
    inputSnapshot: { log, profile },
    outputSnapshot: {},
    disclaimerShown: true
  };
}
