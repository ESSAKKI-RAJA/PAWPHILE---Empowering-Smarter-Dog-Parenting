import React from "react";
import { ChatMessage } from "../../types/chat";
import { getSeverityColor, getSeverityLabel } from "../../utils/chatHelpers";
import { AIResponseBlock } from "./AIResponseBlock";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
}) => {
  const isUser = message.role === "user";
  const metadata = message.metadata;

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 animate-slide-up">
        <div className="max-w-[85%]">
          <div className="bg-primary text-white rounded-l-2xl rounded-tr-2xl p-4 shadow-sm text-15px leading-relaxed">
            {message.content}
          </div>
          <div className="text-11px text-muted-400 mt-1.5 text-right px-1">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    );
  }

  // Helper to try and heuristically parse PAW AI responses 
  // if they aren't pre-structured by the engine.
  // We'll extract what we can or fall back to full content.
  const understandStr = message.content;
  const toDoNowStr = metadata?.nextAction || "Monitor your dog's condition.";
  let escalationStr = metadata?.vetEscalation || "If symptoms worsen, persist for more than 24 hours, or you notice any red flags.";
  
  if (metadata?.redFlags && metadata.redFlags.length > 0) {
    escalationStr += ` Watch for: ${metadata.redFlags.join(', ')}.`;
  }

  return (
    <div className="flex justify-start mb-6 animate-slide-up">
      <div className="flex flex-col gap-1 w-full">
        <AIResponseBlock 
          understand={understandStr}
          mayMatter={metadata?.dataUsed ? `Based on ${metadata.dataUsed.length} health record(s) and standard guidelines.` : 'Taking into account your dog\'s profile and recent logs.'}
          toDoNow={toDoNowStr}
          escalation={escalationStr}
        />
        <div className="flex items-center gap-2 mt-2 px-1">
           {metadata?.severity && (
            <div className={`text-10px font-bold px-2 py-0.5 rounded-sm ${getSeverityColor(metadata.severity)}`}>
              {getSeverityLabel(metadata.severity)}
            </div>
           )}
           <span className="text-11px text-muted-400">
             {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
           </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;
