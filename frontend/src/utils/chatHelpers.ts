import { ChatMessage, ChatContextData } from "../types/chat";

/**
 * Extract the dog's context from profile for chat operations
 */
export function buildChatContext(dogProfile: any): ChatContextData {
  return {
    breed: dogProfile?.breed || dogProfile?.breedName,
    age: dogProfile?.age,
    weight: dogProfile?.weight || dogProfile?.weightKg,
    knownAllergies: dogProfile?.knownAllergies || [],
    recentSymptoms: dogProfile?.recentSymptoms || [],
  };
}

/**
 * Get the last N messages from the conversation
 */
export function getRecentMessages(
  messages: ChatMessage[],
  count: number = 5,
): ChatMessage[] {
  return messages.slice(Math.max(0, messages.length - count));
}

/**
 * Format conversation history for API context
 */
export function formatConversationContext(messages: ChatMessage[]): string {
  return messages
    .map(
      (m) =>
        `${m.role === "user" ? "User" : "PAW AI"}: ${m.content.substring(0, 200)}...`,
    )
    .join("\n");
}

/**
 * Check if a question has already been asked in the conversation
 */
export function hasAlreadyAsked(
  messages: ChatMessage[],
  keyword: string,
): boolean {
  return messages.some(
    (m) =>
      m.role === "assistant" &&
      m.content.toLowerCase().includes(keyword.toLowerCase()),
  );
}

/**
 * Extract the main symptom/concern from the conversation
 */
export function extractMainConcern(messages: ChatMessage[]): string {
  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase());
  const allText = userMessages.join(" ");

  // Look for keyword patterns
  const symptomsMap: { [key: string]: string } = {
    vomit: "vomiting",
    diarrhea: "diarrhea",
    eat: "appetite loss",
    drink: "drinking abnormality",
    cough: "cough",
    breathe: "breathing difficulty",
    skin: "skin issue",
    itch: "itching",
    limp: "limping",
    seizure: "seizure",
    behavior: "behavioral change",
  };

  for (const [keyword, symptom] of Object.entries(symptomsMap)) {
    if (allText.includes(keyword)) {
      return symptom;
    }
  }

  return "general health concern";
}

/**
 * Determine if conversation should escalate to Red severity
 */
export function shouldEscalateToRed(messages: ChatMessage[]): boolean {
  const allText = messages.map((m) => m.content.toLowerCase()).join(" ");

  const emergencyKeywords = [
    "collapse",
    "unconscious",
    "seizure",
    "can't breathe",
    "bleeding",
    "trauma",
    "pale gums",
    "unresponsive",
    "choking",
    "poisoned",
  ];

  return emergencyKeywords.some((keyword) => allText.includes(keyword));
}

/**
 * Get suggested next questions based on last assistant message
 */
export function generateFollowUpQuestions(
  lastAssistantMessage: ChatMessage,
): string[] {
  const content = lastAssistantMessage.metadata?.followUpQuestions;
  if (content && content.length > 0) {
    return content;
  }

  // Fallback based on message content
  const message = lastAssistantMessage.content.toLowerCase();

  if (message.includes("eating")) {
    return ["Yes, eating normally", "Not eating", "Eating less than usual"];
  } else if (message.includes("drinking")) {
    return ["Drinking normally", "Not drinking", "Drinking too much"];
  } else if (message.includes("vomiting")) {
    return ["Once", "2-3 times", "More than 5 times"];
  } else if (message.includes("fever")) {
    return ["Yes, seems hot", "No, seems cool", "Not sure"];
  } else if (message.includes("playful")) {
    return ["Yes, playful", "Somewhat lethargic", "Very lethargic"];
  }

  return ["Tell me more", "This is my only concern", "Ask me something else"];
}

/**
 * Calculate severity color for UI display
 */
export function getSeverityColor(severity: string | undefined): string {
  switch (severity) {
    case "Red":
      return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20";
    case "Yellow":
      return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20";
    case "Green":
      return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20";
    default:
      return "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/20";
  }
}

/**
 * Get emergency label for severity
 */
export function getSeverityLabel(severity: string | undefined): string {
  switch (severity) {
    case "Red":
      return "🚨 EMERGENCY";
    case "Yellow":
      return "⚠️ URGENT";
    case "Green":
      return "✓ MONITOR";
    default:
      return "ℹ️ INFO";
  }
}

/**
 * Store conversation to localStorage
 */
export function saveConversationToStorage(
  sessionId: string,
  messages: ChatMessage[],
): void {
  try {
    const session = {
      id: sessionId,
      messages: messages.map((m) => ({
        ...m,
        timestamp: m.timestamp.toISOString(),
      })),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`pawai_session_${sessionId}`, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to save chat to localStorage:", error);
  }
}

/**
 * Load conversation from localStorage
 */
export function loadConversationFromStorage(
  sessionId: string,
): ChatMessage[] | null {
  try {
    const stored = localStorage.getItem(`pawai_session_${sessionId}`);
    if (!stored) return null;

    const session = JSON.parse(stored);
    return session.messages.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch (error) {
    console.error("Failed to load chat from localStorage:", error);
    return null;
  }
}

/**
 * Clear conversation from localStorage
 */
export function clearConversationFromStorage(sessionId: string): void {
  try {
    localStorage.removeItem(`pawai_session_${sessionId}`);
  } catch (error) {
    console.error("Failed to clear chat from localStorage:", error);
  }
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
