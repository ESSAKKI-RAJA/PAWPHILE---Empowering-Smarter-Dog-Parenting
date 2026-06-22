export type MessageRole = "user" | "assistant" | "system";
export type SeverityLevel = "Red" | "Yellow" | "Green";

export interface ChatMessageMetadata {
  severity?: SeverityLevel;
  confidence?: number;
  dataUsed?: string[];
  nextAction?: string;
  vetEscalation?: boolean;
  followUpQuestions?: string[];
  redFlags?: string[];
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: ChatMessageMetadata;
}

export interface ChatSession {
  id: string;
  dogId?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatContextData {
  breed?: string;
  age?: number;
  weight?: number;
  vaccineStatus?: "up-to-date" | "overdue" | "unknown";
  knownAllergies?: string[];
  recentSymptoms?: string[];
}
