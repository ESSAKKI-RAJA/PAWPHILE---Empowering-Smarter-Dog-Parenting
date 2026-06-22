import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Save, AlertTriangle } from "lucide-react";
import { usePawphileData } from "../context/PawphileDataContext";
import { sendMessage, generateQuickChips } from "../services/chatEngine";
import ChatMessageBubble from "../components/chat/ChatMessageBubble";
import QuickChipRow from "../components/chat/QuickChipRow";
import { ChatMessage } from "../types/chat";
import {
  generateSessionId,
  saveConversationToStorage,
  loadConversationFromStorage,
  clearConversationFromStorage,
} from "../utils/chatHelpers";
import { formatContextInfo } from "../services/chatEngine";

export const PawAiCenter: React.FC = () => {
  const navigate = useNavigate();
  const { selectedDog } = usePawphileData();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session and message state
  const [sessionId] = useState(() => generateSessionId());
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Try to load from localStorage
    const saved = loadConversationFromStorage(sessionId);
    if (saved && saved.length > 0) {
      return saved;
    }
    // Default welcome message
    return [
      {
        id: "welcome",
        role: "assistant",
        content: `👋 Hi! I'm **PAW AI**, your dog health companion.

I'm here to help you understand what might be going on with ${selectedDog?.name || "your dog"} and guide you on next steps.

**How I work:**
• I'll ask questions to understand the situation
• I provide guidance based on symptoms (not diagnosis)
• I escalate to emergency vet care when needed
• I always recommend consulting your vet

**Please note:** I'm a decision-support tool, not a veterinarian. Always consult a licensed vet for diagnosis and treatment.

---

What's happening with ${selectedDog?.name || "your dog"} today?`,
        timestamp: new Date(),
        metadata: {
          severity: "Green",
        },
      },
    ];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [shouldAutoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Save conversation to localStorage whenever messages change
  useEffect(() => {
    saveConversationToStorage(sessionId, messages);
  }, [messages, sessionId]);

  // Handle sending a message
  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading || !selectedDog) {
        return;
      }

      // Create user message
      const userMessage: ChatMessage = {
        id: `msg_user_${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date(),
      };

      // Add to messages immediately
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setError(null);
      setIsLoading(true);

      try {
        // Get AI response
        const assistantMessage = await sendMessage(messages, text, selectedDog);
        setMessages((prev) => [...prev, assistantMessage]);

        // Check if severity is Red - show prominent warning
        if (assistantMessage.metadata?.severity === "Red") {
          setShouldAutoScroll(true);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);

        // Add error message to chat
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_error_${Date.now()}`,
            role: "assistant",
            content: `Sorry, I encountered an error: ${errorMessage}. Please try again or refresh the page.`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, selectedDog, isLoading],
  );

  // Handle chip click
  const handleChipClick = (chip: string) => {
    handleSend(chip);
  };

  // Clear chat
  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear this conversation?")) {
      clearConversationFromStorage(sessionId);
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `👋 Hi! I'm **PAW AI**, your dog health companion.

I'm here to help you understand what might be going on with ${selectedDog?.name || "your dog"} and guide you on next steps.

**How I work:**
• I'll ask questions to understand the situation
• I provide guidance based on symptoms (not diagnosis)
• I escalate to emergency vet care when needed
• I always recommend consulting your vet

**Please note:** I'm a decision-support tool, not a veterinarian. Always consult a licensed vet for diagnosis and treatment.

---

What's happening with ${selectedDog?.name || "your dog"} today?`,
          timestamp: new Date(),
          metadata: {
            severity: "Green",
          },
        },
      ]);
      setInput("");
      setError(null);
    }
  };

  // Save conversation to file (export as JSON)
  const handleSaveConversation = () => {
    const conversation = {
      dog: selectedDog?.name || "Unknown",
      date: new Date().toISOString(),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        metadata: m.metadata,
      })),
    };

    const json = JSON.stringify(conversation, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pawai-chat-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get dynamic chips
  const dynamicChips = generateQuickChips(messages, selectedDog);

  // No dog selected - show prompt
  if (!selectedDog) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-950">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Select Your Dog First
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Please go to your profile and select or add your dog to start a
              conversation with PAW AI.
            </p>
            <button
              onClick={() => navigate("/profile")}
              className="px-6 py-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors font-semibold"
            >
              Go to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/")}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  PAW AI Health Assistant
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  🐕 Chatting with:{" "}
                  <strong>{selectedDog?.name || "Your Dog"}</strong>
                  {selectedDog?.breed && ` • ${selectedDog.breed}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveConversation}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                title="Save conversation"
              >
                <Save className="w-5 h-5" />
              </button>
              <button
                onClick={handleClearChat}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                title="Clear chat"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Context info */}
          {selectedDog && (
            <div className="text-xs text-slate-500 dark:text-slate-400 px-2">
              {formatContextInfo({
                breed: selectedDog.breed,
                age: selectedDog.age,
                weight: selectedDog.weight || (selectedDog as any).weightKg,
              })}
            </div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-4xl mx-auto w-full">
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center text-white">
              🐕
            </div>
            <div className="flex-1 max-w-md">
              <div className="inline-block p-3 rounded-lg bg-slate-100 dark:bg-slate-800 rounded-bl-none">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-200" />
                </div>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                PAW AI is thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 bg-red-50 dark:bg-red-950/20 border-t border-red-200 dark:border-red-900 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 text-sm text-red-800 dark:text-red-200">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Quick chips */}
          {dynamicChips.length > 0 && (
            <QuickChipRow
              chips={dynamicChips}
              onChipClick={handleChipClick}
              isLoading={isLoading}
            />
          )}

          {/* Input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex gap-3"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Describe your dog's symptoms or concern... (Shift+Enter for new line)"
              autoFocus
              rows={2}
              maxLength={1000}
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors font-semibold flex-shrink-0 h-fit"
            >
              Send
            </button>
          </form>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            ⓘ **Disclaimer:** PAW AI is a decision-support tool, not a
            veterinarian. Always consult a licensed vet for diagnosis and
            treatment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PawAiCenter;
