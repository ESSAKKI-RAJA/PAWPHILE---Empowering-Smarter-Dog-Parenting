import React from "react";
import { ChatMessage } from "../../types/chat";
import { getSeverityColor, getSeverityLabel } from "../../utils/chatHelpers";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
}) => {
  const isUser = message.role === "user";
  const metadata = message.metadata;

  // Render markdown-like formatting
  const renderContent = (content: string) => {
    return content.split("\n").map((line, idx) => {
      // Bold text: **text**
      if (line.includes("**")) {
        return (
          <div key={idx} className="mb-2">
            {line
              .split(/\*\*(.+?)\*\*/g)
              .map((part, i) =>
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
              )}
          </div>
        );
      }
      // Heading: ###
      if (line.startsWith("###")) {
        return (
          <div key={idx} className="font-semibold text-sm mt-2 mb-1">
            {line.replace(/^#+\s*/, "")}
          </div>
        );
      }
      // List item
      if (line.startsWith("• ") || line.startsWith("- ")) {
        return (
          <div key={idx} className="ml-4 text-sm">
            {line}
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-1" />;
      }
      return (
        <div key={idx} className="text-sm">
          {line}
        </div>
      );
    });
  };

  return (
    <div
      className={`flex gap-3 mb-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-blue-500 dark:bg-blue-600 text-white"
            : "bg-emerald-500 dark:bg-emerald-600 text-white"
        }`}
      >
        {isUser ? "👤" : "🐕"}
      </div>

      {/* Message bubble */}
      <div
        className={`flex-1 max-w-xs lg:max-w-md ${
          isUser ? "text-right" : "text-left"
        }`}
      >
        <div
          className={`inline-block p-3 rounded-lg ${
            isUser
              ? "bg-blue-500 dark:bg-blue-600 text-white rounded-br-none"
              : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none"
          }`}
        >
          <div className="text-sm leading-relaxed">
            {renderContent(message.content)}
          </div>
        </div>

        {/* Metadata - show below message for assistant only */}
        {!isUser && metadata && (
          <div className="mt-2 space-y-1 text-xs">
            {metadata.severity && (
              <div
                className={`inline-block px-2 py-1 rounded ${getSeverityColor(metadata.severity)}`}
              >
                {getSeverityLabel(metadata.severity)}
              </div>
            )}

            {metadata.confidence !== undefined && (
              <div className="text-slate-500 dark:text-slate-400">
                Confidence: {Math.round(metadata.confidence * 100)}%
              </div>
            )}

            {metadata.dataUsed && metadata.dataUsed.length > 0 && (
              <details className="text-slate-600 dark:text-slate-300 cursor-pointer">
                <summary>Data used: {metadata.dataUsed.length} sources</summary>
                <ul className="mt-1 ml-2 list-disc text-slate-500 dark:text-slate-400">
                  {metadata.dataUsed.map((data, i) => (
                    <li key={i} className="text-xs">
                      {data}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {metadata.redFlags && metadata.redFlags.length > 0 && (
              <details className="text-red-600 dark:text-red-400 cursor-pointer font-semibold">
                <summary>🚨 Red flags detected</summary>
                <ul className="mt-1 ml-2 list-disc text-red-500 dark:text-red-400">
                  {metadata.redFlags.map((flag, i) => (
                    <li key={i} className="text-xs">
                      {flag}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {metadata.nextAction && (
              <div className="text-slate-600 dark:text-slate-300 italic">
                💡 {metadata.nextAction}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;
