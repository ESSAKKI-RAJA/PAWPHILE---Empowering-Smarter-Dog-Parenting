import { ChatMessage, ChatContextData, SeverityLevel } from "../types/chat";
import { BREED_KNOWLEDGE_SEED as breedKnowledgeSeed } from "../data/breedKnowledgeSeed";

interface FallbackResponse {
  severity: SeverityLevel;
  confidence: number;
  message: string;
  nextAction?: string;
  vetEscalation: boolean;
  dataUsed: string[];
  followUpQuestions?: string[];
  redFlags?: string[];
}

// Red flag keywords that indicate immediate veterinary attention
const RED_FLAG_KEYWORDS = [
  "collapse",
  "collapse",
  "unconscious",
  "seizing",
  "seizure",
  "can't breathe",
  "difficulty breathing",
  "gasping",
  "bleeding heavily",
  "hemorrhaging",
  "hit by car",
  "trauma",
  "pale gums",
  "gums pale",
  "gums white",
  "gums blue",
  "blue tongue",
  "severe pain",
  "whimpering in pain",
  "not breathing",
  "choking",
  "choked",
  "toxin",
  "poisoned",
  "poison",
  "overdose",
  "extreme lethargy",
  "unresponsive",
];

// Yellow flag keywords indicating urgency (within hours)
const YELLOW_FLAG_KEYWORDS = [
  "vomiting repeatedly",
  "not eating",
  "won't eat",
  "anorexia",
  "repeated diarrhea",
  "bloody stool",
  "bloody diarrhea",
  "won't drink",
  "won't stop drinking",
  "excessive thirst",
  "excessive urination",
  "straining to urinate",
  "can't urinate",
  "abdominal pain",
  "bloated",
  "distended",
  "fever",
  "high fever",
  "refuses to move",
  "severe limp",
  "lameness",
  "severe lethargy",
];

export function enhancedLocalFallback(
  messages: ChatMessage[],
  userInput: string,
  context: ChatContextData,
): FallbackResponse {
  const userHistory = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase());
  const assistantHistory = messages.filter((m) => m.role === "assistant");
  const combinedHistory = userHistory.join(" ").toLowerCase();

  // Check for red flags
  const foundRedFlags = RED_FLAG_KEYWORDS.filter(
    (flag) =>
      userInput.toLowerCase().includes(flag) || combinedHistory.includes(flag),
  );

  if (foundRedFlags.length > 0) {
    return {
      severity: "Red",
      confidence: 0.95,
      message: `🚨 **EMERGENCY - SEEK IMMEDIATE VET CARE**\n\nI've detected potential emergency signs:\n${foundRedFlags.map((f) => `• ${f}`).join("\n")}\n\n**Please go to an emergency veterinary clinic immediately.** Do not wait for a regular appointment.\n\nIf you cannot reach a vet, call your local emergency animal hospital right away.`,
      vetEscalation: true,
      nextAction: "Emergency vet visit required",
      dataUsed: ["Red flag detection", "Real-time symptoms"],
      redFlags: foundRedFlags,
    };
  }

  // Check for yellow flags
  const foundYellowFlags = YELLOW_FLAG_KEYWORDS.filter(
    (flag) =>
      userInput.toLowerCase().includes(flag) || combinedHistory.includes(flag),
  );

  if (foundYellowFlags.length > 0) {
    return {
      severity: "Yellow",
      confidence: 0.85,
      message: `⚠️ **Schedule a vet visit within a few hours**\n\nI've identified concerning symptoms:\n${foundYellowFlags.map((f) => `• ${f}`).join("\n")}\n\nWhile not an immediate emergency, these require professional evaluation. Contact your vet and describe these symptoms to determine how urgent it is.`,
      vetEscalation: true,
      nextAction: "Contact vet within 2-4 hours",
      dataUsed: ["Yellow flag detection", "Real-time symptoms"],
      followUpQuestions: [
        "Has your dog shown these signs before?",
        "When did this start?",
      ],
      redFlags: foundYellowFlags,
    };
  }

  // Contextual follow-up logic
  const isAskingAboutEating =
    assistantHistory.some(
      (m) =>
        m.content.toLowerCase().includes("eating") ||
        m.content.toLowerCase().includes("appetite"),
    ) && !userHistory[userHistory.length - 1]?.includes("eating");

  const isAskingAboutDrinking =
    assistantHistory.some(
      (m) =>
        m.content.toLowerCase().includes("water") ||
        m.content.toLowerCase().includes("drinking"),
    ) && !userHistory[userHistory.length - 1]?.includes("drinking");

  const isAskingAboutDiarrhea =
    assistantHistory.some(
      (m) =>
        m.content.toLowerCase().includes("stool") ||
        m.content.toLowerCase().includes("diarrhea"),
    ) && !userHistory[userHistory.length - 1]?.includes("stool");

  // Breed-specific context
  let breedInfo = "";
  if (context.breed) {
    const breedLower = context.breed.toLowerCase();
    const knownBreedRisks =
      breedKnowledgeSeed.find(
        (breed) => breed.name.toLowerCase() === breedLower,
      )?.commonRiskTags || [];
    if (knownBreedRisks.length > 0) {
      breedInfo = `\n\nNote: ${context.breed} is prone to certain conditions. Keep in mind: ${knownBreedRisks.slice(0, 2).join(", ")}`;
    }
  }

  // Construct response based on conversation flow
  let responseMessage = "";
  let nextAction = "Monitor and contact vet if worsens";
  let followUp: string[] = [];
  const dataUsedList: string[] = ["Conversation history"];

  if (messages.length <= 1) {
    // First message/greeting
    responseMessage = `Hello! I'm PAW AI, here to help you understand ${context.breed ? context.breed : "your dog"}'s health concerns.\n\nTo give you the most accurate guidance, I'll ask you a few questions. Please describe the main concern about your dog right now.${breedInfo}`;
    followUp = [
      "Vomiting",
      "Diarrhea",
      "Not eating",
      "Lethargy",
      "Skin issues",
      "Cough/Breathing",
    ];
  } else {
    // Ongoing conversation
    const concern = userInput.toLowerCase();

    if (concern.includes("vomit") && !isAskingAboutEating) {
      responseMessage = `I understand your dog has been vomiting. A few quick questions to help:\n\n1. **How many times** in the last 12 hours?\n2. **Can he keep water down**, or does he throw that up too?\n3. **Any recent diet changes** or access to unusual foods?\n\nThis information helps me assess urgency.`;
      nextAction = "Determine frequency and dehydration risk";
      followUp = [
        "Once or twice",
        "3-5 times",
        "More than 5 times",
        "Not drinking",
      ];
      dataUsedList.push("Vomiting history");
    } else if (concern.includes("diarrhea")) {
      responseMessage = `Diarrhea can have many causes. Let me ask:\n\n1. **How often** is he going?\n2. **Any blood or mucus** in the stool?\n3. **Is his appetite normal**, or less than usual?\n4. **Recent diet change** or new treats?\n\nThese details help determine if it's dietary or something that needs urgent attention.`;
      nextAction = "Assess severity and hydration";
      followUp = [
        "Frequent but normal",
        "Bloody stool",
        "Lost appetite",
        "Normal appetite",
      ];
      dataUsedList.push("GI history");
    } else if (
      concern.includes("not eating") ||
      concern.includes("won't eat")
    ) {
      responseMessage = `Loss of appetite can indicate various issues. Help me narrow it down:\n\n1. **For how long** has he not eaten?\n2. **Is he drinking water** normally?\n3. **Any vomiting or diarrhea**?\n4. **Is he playful/alert**, or seems unwell?\n\nThis helps me determine urgency.`;
      nextAction = "Assess appetite loss severity";
      followUp = [
        "Less than 4 hours",
        "4-12 hours",
        "Over 12 hours",
        "Not drinking either",
      ];
      dataUsedList.push("Appetite history");
    } else if (
      concern.includes("lethargy") ||
      concern.includes("not moving") ||
      concern.includes("tired")
    ) {
      responseMessage = `Excessive lethargy can be a sign of several conditions. Let me ask:\n\n1. **Is he responsive** when you call his name?\n2. **Any fever** (nose is hot, ear feels warm)?\n3. **Recent changes** in behavior or energy?\n4. **Any other symptoms** (limping, vomiting, etc.)?\n\nResponsiveness is key here.`;
      nextAction = "Assess level of consciousness";
      followUp = [
        "Responsive but lazy",
        "Somewhat unresponsive",
        "Very hard to wake",
        "Seems feverish",
      ];
      dataUsedList.push("Energy/lethargy history");
    } else if (
      concern.includes("skin") ||
      concern.includes("rash") ||
      concern.includes("itching")
    ) {
      responseMessage = `Skin issues can range from mild to serious. Tell me:\n\n1. **Where** on the body is the problem?\n2. **Is he excessively scratching/licking**?\n3. **Any redness, scabs, or hair loss**?\n4. **Recent changes** in food, environment, or outdoor exposure?\n\nThis helps me assess infection risk or allergies.`;
      nextAction = "Determine skin condition severity";
      followUp = [
        "Mild itching",
        "Intense scratching",
        "Hair loss",
        "Open sores/scabs",
      ];
      dataUsedList.push("Skin history");
    } else if (
      concern.includes("cough") ||
      concern.includes("breathing") ||
      concern.includes("wheeze")
    ) {
      responseMessage = `Respiratory issues need attention. Quick assessment:\n\n1. **Is breathing labored** or is it just a cough?\n2. **Any discharge** from nose or mouth?\n3. **Is the cough constant** or occasional?\n4. **Any fever or lethargy**?\n\nDifficulty breathing is urgent.`;
      nextAction = "Assess respiratory distress";
      followUp = [
        "Occasional cough",
        "Frequent cough",
        "Labored breathing",
        "Seems fine otherwise",
      ];
      dataUsedList.push("Respiratory history");
    } else {
      responseMessage = `Based on what you've shared, I'll continue monitoring. To help further:\n\n1. **Has this happened before**?\n2. **Any recent vet visits** or medications?\n3. **Recent dietary changes**?\n4. **Is your dog up-to-date** with vaccines and deworming?\n\nThis context helps me assess overall health.`;
      nextAction = "Gather full medical history";
      followUp = [
        "Yes, happened before",
        "First time",
        "Recently to vet",
        "No vet in months",
      ];
      dataUsedList.push("Medical history");
    }
  }

  // Final disclaimer
  const disclaimerText =
    "\n\n---\n*ⓘ **Disclaimer:** PAW AI is a decision-support tool, not a veterinarian. Always consult a licensed vet for diagnosis and treatment. This conversation does not replace professional veterinary advice.*";

  return {
    severity: "Green",
    confidence: 0.7,
    message: responseMessage + disclaimerText,
    vetEscalation: false,
    nextAction,
    dataUsed: dataUsedList,
    followUpQuestions: followUp,
  };
}

export default enhancedLocalFallback;
