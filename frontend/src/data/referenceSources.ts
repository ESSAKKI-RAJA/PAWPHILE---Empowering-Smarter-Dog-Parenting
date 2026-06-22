export type SourceCategory =
  | 'nutrition'
  | 'bcs'
  | 'triage'
  | 'emergency'
  | 'vaccination'
  | 'breedRisk'
  | 'foodSafety'
  | 'reports';

export type ReferenceSource = {
  id: string;
  name: string;
  shortName: string;
  category: SourceCategory;
  purpose: string;
  url?: string;
  note: string;
};

export const referenceSources: Record<SourceCategory, ReferenceSource[]> = {
  nutrition: [
    {
      id: 'wsava_nutrition',
      name: 'WSAVA Global Nutrition Guidelines',
      shortName: 'WSAVA',
      category: 'nutrition',
      purpose: 'Nutritional assessment and calorie needs estimation',
      note: 'Provides the framework for maintenance energy requirement calculations.',
    },
    {
      id: 'aaha_nutrition',
      name: 'AAHA Nutrition and Weight Management Guidelines',
      shortName: 'AAHA',
      category: 'nutrition',
      purpose: 'Weight management and dietary assessment',
      note: 'Guidelines for assessing dog weight and caloric adjustments.',
    },
    {
      id: 'msd_rer',
      name: 'MSD/Merck Veterinary Manual',
      shortName: 'MSD/Merck Veterinary Manual',
      category: 'nutrition',
      purpose: 'Resting Energy Requirement (RER) formula basis',
      note: 'RER = 70 × (body weight in kg)^0.75.',
    },
  ],
  bcs: [
    {
      id: 'wsava_bcs',
      name: 'WSAVA Body Condition Score charts',
      shortName: 'WSAVA',
      category: 'bcs',
      purpose: 'Visual and physical assessment of body fat',
      note: 'A 9-point scale used to determine if a dog is underweight, ideal, or overweight.',
    },
    {
      id: 'aaha_weight',
      name: 'AAHA Nutrition and Weight Management Guidelines',
      shortName: 'AAHA',
      category: 'bcs',
      purpose: 'Weight management protocols',
      note: 'Used in tandem with BCS for determining target body weight.',
    },
    {
      id: 'msd_obesity',
      name: 'MSD/Merck Veterinary Manual',
      shortName: 'MSD/Merck Veterinary Manual',
      category: 'bcs',
      purpose: 'Obesity risk definitions',
      note: 'Defines the health risks associated with a high body condition score.',
    }
  ],
  triage: [
    {
      id: 'msd_triage',
      name: 'MSD/Merck Veterinary Manual',
      shortName: 'MSD/Merck Veterinary Manual',
      category: 'triage',
      purpose: 'Clinical sign recognition and severity mapping',
      note: 'General reference for symptom progression and typical veterinary response times.',
    },
    {
      id: 'aaha_lifestage',
      name: 'AAHA Canine Life Stage Guidelines',
      shortName: 'AAHA',
      category: 'triage',
      purpose: 'Age-specific risk factors',
      note: 'Helps determine severity based on the dog’s life stage (puppy, adult, senior).',
    },
    {
      id: 'wsava_pain',
      name: 'WSAVA Pain Recognition Guidelines',
      shortName: 'WSAVA',
      category: 'triage',
      purpose: 'Pain symptom identification',
      note: 'Reference for identifying signs of discomfort and their urgency.',
    }
  ],
  emergency: [
    {
      id: 'msd_emergency',
      name: 'MSD/Merck Veterinary Manual (Emergency)',
      shortName: 'MSD/Merck Veterinary Manual',
      category: 'emergency',
      purpose: 'Emergency protocol baselines',
      note: 'Defines life-threatening symptoms such as breathing difficulty, collapse, and severe bleeding.',
    },
    {
      id: 'avma_firstaid',
      name: 'AVMA Pet First-Aid / Household Hazards',
      shortName: 'AVMA',
      category: 'emergency',
      purpose: 'First-aid and immediate response guidance',
      note: 'Guidance on what constitutes a veterinary emergency.',
    },
    {
      id: 'aspca_poison',
      name: 'ASPCA Animal Poison Control',
      shortName: 'ASPCA Animal Poison Control',
      category: 'emergency',
      purpose: 'Toxicology reference',
      note: 'Used to identify highly toxic substances like xylitol, chocolate, grapes, and household chemicals.',
    }
  ],
  vaccination: [
    {
      id: 'aaha_vaccine',
      name: 'AAHA Canine Vaccination Guidelines',
      shortName: 'AAHA',
      category: 'vaccination',
      purpose: 'Core and non-core vaccination schedules',
      note: 'Defines standard vaccination intervals in North America.',
    },
    {
      id: 'wsava_vaccine',
      name: 'WSAVA Vaccination Guidelines',
      shortName: 'WSAVA',
      category: 'vaccination',
      purpose: 'Global vaccination recommendations',
      note: 'Provides international consensus on core vaccinations.',
    }
  ],
  breedRisk: [
    {
      id: 'omia',
      name: 'OMIA Inherited Disorders Database',
      shortName: 'OMIA',
      category: 'breedRisk',
      purpose: 'Genetic disease reference',
      note: 'Catalog of inherited disorders in dogs.',
    },
    {
      id: 'ipfd',
      name: 'IPFD / DogWellNet',
      shortName: 'IPFD/DogWellNet',
      category: 'breedRisk',
      purpose: 'Breed-specific health strategies',
      note: 'International partnership for dog health.',
    },
    {
      id: 'ofa',
      name: 'OFA / CHIC Breed Screening',
      shortName: 'OFA/CHIC',
      category: 'breedRisk',
      purpose: 'Orthopedic and health screening requirements',
      note: 'Database of typical health clearances recommended by breed clubs.',
    }
  ],
  foodSafety: [
    {
      id: 'aafco',
      name: 'AAFCO Pet Food Label Standards',
      shortName: 'AAFCO',
      category: 'foodSafety',
      purpose: 'Nutritional adequacy statements',
      note: 'Guidelines for commercial pet food labeling in North America.',
    },
    {
      id: 'fediaf',
      name: 'FEDIAF Nutritional Guidelines',
      shortName: 'FEDIAF',
      category: 'foodSafety',
      purpose: 'European pet food nutritional requirements',
      note: 'Standards for complete and balanced pet food in Europe.',
    },
    {
      id: 'fda',
      name: 'FDA/openFDA Pet Food Recalls',
      shortName: 'FDA/openFDA',
      category: 'foodSafety',
      purpose: 'Food safety and recall alerts',
      note: 'Database of pet food recalls and safety warnings.',
    }
  ],
  reports: [
    {
      id: 'report_summary',
      name: 'PAWPHILE Generated Health Report',
      shortName: 'Reports',
      category: 'reports',
      purpose: 'Aggregated health summary',
      note: 'Compilation of user-entered data assessed against the above reference sources.',
    }
  ],
};

export function getSourcesByCategory(category: SourceCategory): ReferenceSource[] {
  return referenceSources[category] || [];
}

export function getSourceNamesByCategory(category: SourceCategory): string[] {
  return getSourcesByCategory(category).map(s => s.name);
}

export function getEngineSourceMap(): Record<SourceCategory, string[]> {
  const map = {} as Record<SourceCategory, string[]>;
  for (const cat in referenceSources) {
    map[cat as SourceCategory] = referenceSources[cat as SourceCategory].map(s => s.shortName);
  }
  return map;
}

export function getAllReferenceSources(): ReferenceSource[] {
  return Object.values(referenceSources).flat();
}

export function getCompactReferenceList(): string[] {
  const uniqueNames = new Set(getAllReferenceSources().map(s => s.shortName));
  return Array.from(uniqueNames);
}
