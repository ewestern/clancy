import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { clsx } from "clsx";
import type { ChatMessage } from "../../types";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isProcessing?: boolean;
  inputEnabled?: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isProcessing = false,
  inputEnabled = true,
}: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      onSendMessage(inputMessage.trim());
      setInputMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputMessage.trim()) {
        onSendMessage(inputMessage.trim());
        setInputMessage("");
      }
    }
  };

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(timestamp);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx(
              "flex items-start space-x-3",
              message.sender === "user"
                ? "flex-row-reverse space-x-reverse"
                : "",
            )}
          >
            {/* Avatar */}
            <div
              className={clsx(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                message.sender === "agent"
                  ? "bg-primary-100 text-primary-600"
                  : "bg-gray-100 text-gray-600",
              )}
            >
              {message.sender === "agent" ? (
                <Bot size={16} />
              ) : (
                <User size={16} />
              )}
            </div>

            {/* Message content */}
            <div
              className={clsx(
                "flex-1 max-w-[80%]",
                message.sender === "user" ? "text-right" : "",
              )}
            >
              <div
                className={clsx(
                  "inline-block p-3 rounded-lg text-sm",
                  message.sender === "agent"
                    ? "bg-gray-100 text-gray-900"
                    : "bg-primary-600 text-white",
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>

              {/* Workflow updates indicator */}
              {message.workflowUpdates &&
                message.workflowUpdates.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-2">
                      <span className="font-medium">
                        📝 {message.workflowUpdates.length} workflow update(s)
                        applied
                      </span>
                    </div>
                  </div>
                )}

              <div
                className={clsx(
                  "text-xs text-gray-500 mt-1",
                  message.sender === "user" ? "text-right" : "",
                )}
              >
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600">Processing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-3 items-end">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={inputEnabled ? "Ask questions or provide feedback about the workflow..." : "Wait for the AI Employee Designer to request feedback..."}
            className="flex-1 border border-gray-300 rounded-button px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent text-sm resize-none min-h-[64px] max-h-[112px] overflow-y-auto"
            disabled={isProcessing || !inputEnabled}
            rows={2}
            style={{
              height: 'auto',
              minHeight: '64px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 112)}px`;
            }}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isProcessing || !inputEnabled}
            className={clsx(
              "inline-flex items-center px-4 py-2 rounded-button text-sm font-medium transition-colors",
              inputMessage.trim() && !isProcessing && inputEnabled
                ? "bg-primary-600 text-white hover:bg-primary-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed",
            )}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
