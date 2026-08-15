import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Save, RotateCcw, Sparkles, AlertTriangle 
} from "lucide-react";
import { usePawphileData } from "../context/PawphileDataContext";
import { usePersonalization } from "../context/PersonalizationContext";
import { ChatMessage } from "../types/chat";
import { ChatMessageBubble } from "../components/chat/ChatMessageBubble";
import { QuickChipRow } from "../components/chat/QuickChipRow";
import { sendMessage, generateQuickChips, formatContextInfo } from "../services/chatEngine";

export default function PawAiCenter() {
  const navigate = useNavigate();
  const { selectedDog, triageResults } = usePawphileData();
  const pawAiContext = usePersonalization();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length === 0 && selectedDog) {
      setMessages([
        {
          id: "welcome-msg",
          role: "assistant",
          content: `Hi there. I'm PAW AI. I can help you understand ${selectedDog.name}'s symptoms or answer questions about their health based on their profile. What's on your mind?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [selectedDog, messages.length]);

  const handleSend = async (text: string) => {
    if (!text.trim() || !selectedDog) return;

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const responseMsg = await sendMessage(messages, text, pawAiContext);
      setMessages((prev) => [...prev, responseMsg]);
    } catch (err: any) {
      console.error("Failed to get AI response:", err);
      setError(err.message || "Failed to communicate with PAW AI. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipClick = (chipText: string) => {
    handleSend(chipText);
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear this conversation?")) {
      setMessages([]);
    }
  };

  const dynamicChips = generateQuickChips(messages, pawAiContext);

  if (!selectedDog) {
    return (
      <div className="pw-page flex flex-col items-center justify-center min-h-screen px-6">
        <AlertTriangle className="w-12 h-12 text-safety-yellow-primary mb-4" />
        <h1 className="text-24px font-bold text-ink-950 mb-2">Select Your Dog First</h1>
        <button onClick={() => navigate("/profile")} className="pw-btn-primary w-full max-w-xs mt-6">
          Go to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="pw-page flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="bg-ivory-50 border-b border-line-200 px-4 py-3 sticky top-0 z-20">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-full hover:bg-line-200/50 transition">
              <ArrowLeft className="w-5 h-5 text-ink-950" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-lavender-600" />
                <h1 className="text-16px font-bold text-ink-950 leading-none">PAW AI</h1>
              </div>
              <p className="text-12px text-muted-600 mt-1">
                Consulting on {selectedDog.name}
              </p>
            </div>
          </div>
          <button onClick={handleClearChat} className="p-2 text-muted-600 hover:text-ink-950 transition">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.map((message) => (
            <ChatMessageBubble key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="flex justify-start mb-6 animate-fade-in">
              <div className="bg-white border-l-4 border-line-200 rounded-r-2xl rounded-bl-2xl p-4 shadow-sm w-[200px]">
                <div className="flex gap-1.5 items-center justify-center">
                  <div className="w-2 h-2 bg-lavender-600 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-lavender-600 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-lavender-600 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-ivory-50 border-t border-line-200 p-4 pb-8">
        <div className="max-w-3xl mx-auto">
          {dynamicChips.length > 0 && (
            <div className="mb-3 hide-scrollbar overflow-x-auto whitespace-nowrap pb-1">
              <div className="flex gap-2">
                {dynamicChips.map((chip, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleChipClick(chip)}
                    className="pw-chip !bg-white"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about symptoms, behavior, or care..."
              disabled={isLoading}
              className="pw-input flex-1 !rounded-full !px-5"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:bg-teal-600 disabled:opacity-50 transition shrink-0"
            >
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </button>
          </form>
          <p className="text-10px text-center mt-3 text-muted-400">
            PAW AI is an assistant, not a veterinarian.
          </p>
        </div>
      </div>
    </div>
  );
}
