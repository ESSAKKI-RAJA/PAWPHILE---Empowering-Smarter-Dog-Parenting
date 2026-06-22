export type PawNewsCategory = 'Health' | 'Tips' | 'Seasonal' | 'Safety' | 'Puppy' | 'Parasites' | 'Vaccination';
export type PawNewsRegion = 'India' | 'Chennai' | 'Global';
export type PawNewsSeverity = 'Low' | 'Medium' | 'High';

export interface PawNewsItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  category: PawNewsCategory;
  region: PawNewsRegion;
  location: string;
  source: string;
  trustLabel?: 'Source-backed' | 'Manually reviewed' | 'Unverified local update' | 'Educational';
  isVerified?: boolean;
  publishedAt: string;
  expiresAt: string;
  refreshCycle: string;
  url: string;
  tags: string[];
  date: string;
  readTime: string;
}

export interface SeasonalAlert {
  id: string;
  title: string;
  description: string;
  severity: PawNewsSeverity;
  actions: string[];
}

export interface PawNewsInteraction {
  saved: string[]; // array of IDs
  helpful: string[]; // array of IDs
}
