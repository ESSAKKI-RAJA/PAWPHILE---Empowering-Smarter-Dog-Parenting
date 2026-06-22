export type SignalColor = 'green' | 'yellow' | 'red';
export type ConfidenceLevel = 'Low' | 'Medium' | 'High';

export interface VisionScreeningInput {
  areaId: string;
  concernType: string;
  duration: string;
  severity: string;
  redFlags: string[];
  notes?: string;
  hasImage: boolean;
}

export interface VisionScreeningResult {
  signalColor: SignalColor;
  signalTitle: string;
  confidence: ConfidenceLevel;
  reasons: string[];
  nextActions: string[];
  safetyMessage: string;
  reportSummary: string;
}

export function calculateVisionSignal(input: VisionScreeningInput): VisionScreeningResult {
  const { concernType, duration, severity, redFlags, hasImage } = input;
  let signalColor: SignalColor = 'green';
  const reasons: string[] = [];
  
  const isRedSeverity = severity.toLowerCase().includes('severe') || severity.toLowerCase().includes('worsening');
  const isYellowSeverity = severity.toLowerCase().includes('moderate');
  const isLongDuration = duration.toLowerCase().includes('3-5') || duration.toLowerCase().includes('week') || duration.toLowerCase().includes('recurring') || duration.toLowerCase().includes('more than a week');
  
  if (redFlags.length > 0 || isRedSeverity) {
    signalColor = 'red';
    if (redFlags.length > 0) {
      reasons.push(`Presence of urgent red flags: ${redFlags.length} detected.`);
    }
    if (isRedSeverity) {
      reasons.push(`Owner assessed severity as severe or worsening.`);
    }
  } else if (isYellowSeverity || isLongDuration || concernType.toLowerCase().includes('discharge') || concernType.toLowerCase().includes('swelling')) {
    signalColor = 'yellow';
    if (isYellowSeverity) reasons.push('Moderate severity reported.');
    if (isLongDuration) reasons.push('Symptoms have persisted for more than 3 days.');
    if (concernType.toLowerCase().includes('discharge') || concernType.toLowerCase().includes('swelling')) reasons.push(`Concern type '${concernType}' warrants close monitoring.`);
  } else {
    signalColor = 'green';
    reasons.push('Mild symptoms with short duration and no red flags reported.');
  }

  // Determine confidence
  let confidence: ConfidenceLevel = 'Low';
  const completenessScore = (hasImage ? 1 : 0) + (concernType ? 1 : 0) + (duration ? 1 : 0) + (severity ? 1 : 0);
  if (completenessScore === 4) {
    confidence = 'High';
  } else if (completenessScore >= 2) {
    confidence = 'Medium';
  } else {
    confidence = 'Low';
  }

  let signalTitle = '';
  let nextActions: string[] = [];
  const safetyMessage = 'PAWPHILE Vision is awareness and preventive decision-support only. It is not a replacement for a licensed veterinarian.';

  if (signalColor === 'red') {
    signalTitle = 'Urgent Veterinary Attention Recommended';
    nextActions = [
      'Contact your local veterinarian or an emergency animal clinic immediately.',
      'Do not attempt to treat the issue at home or apply human medications.',
      'Keep the dog calm and restrict movement if there is pain or injury.'
    ];
  } else if (signalColor === 'yellow') {
    signalTitle = 'Monitor Closely / Consult Vet';
    nextActions = [
      'Monitor closely and consult your vet if symptoms continue or worsen.',
      'Keep the area clean and prevent the dog from scratching or licking it.',
      'Take another photo in 24 hours to compare changes.'
    ];
  } else {
    signalTitle = 'Routine Monitoring';
    nextActions = [
      'Looks mild from provided inputs; monitor and keep clean.',
      'Prevent excessive licking or scratching.',
      'If symptoms worsen, re-assess or contact your vet.'
    ];
  }

  return {
    signalColor,
    signalTitle,
    confidence,
    reasons: reasons.length > 0 ? reasons : ['Assessment based on provided inputs.'],
    nextActions,
    safetyMessage,
    reportSummary: `Screening Result: ${signalTitle} (${signalColor.toUpperCase()}). Confidence: ${confidence}. Based on ${redFlags.length} red flags, ${severity} severity, and ${duration} duration.`
  };
}
