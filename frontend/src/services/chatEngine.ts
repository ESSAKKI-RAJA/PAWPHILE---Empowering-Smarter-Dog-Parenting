import { ChatMessage, ChatContextData } from "../types/chat";
import { enhancedLocalFallback } from "../utils/aiFallback";
import {
  buildChatContext,
  getRecentMessages,
  extractMainConcern,
  generateFollowUpQuestions,
} from "../utils/chatHelpers";

/**
 * Main chat engine that orchestrates conversation with the AI
 * Integrates with backend API or falls back to local rule-based logic
 */

export interface SendMessageOptions {
  includeContext?: boolean;
  maxHistoryMessages?: number;
}

/**
 * Send a message and get an AI response
 * Falls back to local logic if API is unavailable
 */
export async function sendMessage(
  messages: ChatMessage[],
  userInput: string,
  dogProfile: any,
  options: SendMessageOptions = {},
): Promise<ChatMessage> {
  const { includeContext = true, maxHistoryMessages = 10 } = options;

  if (!userInput.trim()) {
    throw new Error("User input cannot be empty");
  }

  // Build context
  const context = buildChatContext(dogProfile);

  // Get recent message history (to stay within token limits)
  const recentMessages = getRecentMessages(messages, maxHistoryMessages);

  // Try API first if available
  try {
    const response = await callChatAPI(recentMessages, userInput, context);
    return response;
  } catch (error) {
    console.warn("Chat API unavailable, using fallback:", error);
    // Fallback to local logic
    return generateLocalResponse(recentMessages, userInput, context);
  }
}

/**
 * Call backend API for chat response
 */
async function callChatAPI(
  recentMessages: ChatMessage[],
  userInput: string,
  context: ChatContextData,
): Promise<ChatMessage> {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

  const payload = {
    messages: recentMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    userInput,
    context,
  };

  const response = await fetch(`${apiUrl}/api/paw-ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    id: `msg_${Date.now()}`,
    role: "assistant",
    content: data.message,
    timestamp: new Date(),
    metadata: {
      severity: data.severity,
      confidence: data.confidence,
      dataUsed: data.dataUsed,
      nextAction: data.nextAction,
      vetEscalation: data.vetEscalation,
      followUpQuestions: data.followUpQuestions,
      redFlags: data.redFlags,
    },
  };
}

/**
 * Generate response using local fallback logic
 */
function generateLocalResponse(
  messages: ChatMessage[],
  userInput: string,
  context: ChatContextData,
): ChatMessage {
  const fallback = enhancedLocalFallback(messages, userInput, context);

  return {
    id: `msg_${Date.now()}`,
    role: "assistant",
    content: fallback.message,
    timestamp: new Date(),
    metadata: {
      severity: fallback.severity,
      confidence: fallback.confidence,
      dataUsed: fallback.dataUsed,
      nextAction: fallback.nextAction,
      vetEscalation: fallback.vetEscalation,
      followUpQuestions: fallback.followUpQuestions,
      redFlags: fallback.redFlags,
    },
  };
}

/**
 * Generate dynamic quick-reply chips based on context
 */
export function generateQuickChips(
  messages: ChatMessage[],
  dogProfile: any,
): string[] {
  // If no messages yet, show common symptoms
  if (messages.length === 0) {
    return [
      "Vomiting",
      "Diarrhea",
      "Not eating",
      "Lethargy",
      "Skin issue",
      "Cough",
      "Limping",
      "Behavior change",
    ];
  }

  const lastMessage = messages[messages.length - 1];

  // If last message was user, use generic chips
  if (lastMessage.role === "user") {
    return [
      "Tell me more",
      "This is my only concern",
      "Ask another question",
      "I want to know more",
    ];
  }

  // If assistant message has suggested follow-ups, use those
  if (
    lastMessage.metadata?.followUpQuestions &&
    lastMessage.metadata.followUpQuestions.length > 0
  ) {
    return lastMessage.metadata.followUpQuestions;
  }

  // Generate contextual chips based on assistant message
  const chips = generateFollowUpQuestions(lastMessage);

  // Add breed-specific chips if applicable
  const dogBreed = dogProfile?.breed || dogProfile?.breedName || "";
  if (dogBreed && chips.length < 4) {
    const breedLower = dogBreed.toLowerCase();
    const breedSpecificChips: { [key: string]: string[] } = {
      pug: ["Pug breathing issues", "Heat sensitivity", "Weight concerns"],
      bulldog: ["Bulldog overheating", "Skin fold infection", "Breathing help"],
      "german shepherd": [
        "Hip dysplasia signs",
        "GSD ear issues",
        "Vaccine schedule",
      ],
      labrador: ["Labrador obesity", "Joint pain", "Skin allergies"],
      husky: ["Husky heat issues", "Escape risks", "Energy needs"],
      "golden retriever": ["Golden ear infections", "Hip health", "Coat care"],
    };

    if (breedSpecificChips[breedLower]) {
      chips.push(...breedSpecificChips[breedLower].slice(0, 2));
    }
  }

  // Add emergency/escalation chips if severity is high
  if (lastMessage.metadata?.severity === "Red") {
    return [
      "Find vet now",
      "Call emergency clinic",
      "Save this report",
      "End chat",
    ];
  }

  if (lastMessage.metadata?.severity === "Yellow") {
    return [
      "Schedule vet visit",
      "Save this report",
      "Ask another question",
      "Clear chat",
    ];
  }

  return chips;
}

/**
 * Format context for display in UI
 */
export function formatContextInfo(context: ChatContextData): string {
  const parts = [];

  if (context.breed) {
    parts.push(`Breed: ${context.breed}`);
  }

  if (context.age) {
    parts.push(`Age: ${context.age} years`);
  }

  if (context.weight) {
    parts.push(`Weight: ${context.weight} kg`);
  }

  if (context.knownAllergies && context.knownAllergies.length > 0) {
    parts.push(`Allergies: ${context.knownAllergies.join(", ")}`);
  }

  return parts.join(" • ");
}

export default { sendMessage, generateQuickChips };
