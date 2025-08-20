import React, { useState } from "react";
import { BookOpen, Bot, ChevronDown, ChevronUp, Eye } from "lucide-react";

interface KnowledgeSnippet {
  id: string;
  content: string | null;
  metadata?: Record<string, unknown>;
  similarity: number;
  documentId?: string;
}

interface KnowledgeSearchCardProps {
  snippet: KnowledgeSnippet;
  onDocumentClick: (documentId: string) => void;
  isDocumentLoading?: boolean;
}

export const KnowledgeSearchCard: React.FC<KnowledgeSearchCardProps> = ({
  snippet,
  onDocumentClick,
  isDocumentLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDocument = !!snippet.documentId;

  // Determine if content needs expansion (more than 4 lines worth of content)
  const needsExpansion = snippet.content && snippet.content.length > 200;

  const displayContent = isExpanded
    ? snippet.content
    : snippet.content?.substring(0, 200) + (needsExpansion ? "..." : "");

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {hasDocument ? (
            <BookOpen className="w-4 h-4 text-blue-500" />
          ) : (
            <Bot className="w-4 h-4 text-purple-500" />
          )}
          <span className="text-xs text-slate-500">
            {hasDocument ? "From Document" : "From Agent"}
          </span>
        </div>
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
          {(snippet.similarity * 100).toFixed(0)}% match
        </span>
      </div>

      <div className="mb-3">
        <p
          className={`text-sm text-slate-800 leading-relaxed ${!isExpanded && needsExpansion ? "line-clamp-4" : ""}`}
        >
          {displayContent || "No preview available"}
        </p>

        {needsExpansion && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 flex items-center space-x-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                <span>Show less</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>Show more</span>
              </>
            )}
          </button>
        )}
      </div>

      {hasDocument && (
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">
                {(snippet.metadata?.filename as string) || "Document"}
              </p>
              <p className="text-xs text-slate-500">DOCUMENT</p>
            </div>
            <button
              onClick={() =>
                snippet.documentId && onDocumentClick(snippet.documentId)
              }
              disabled={isDocumentLoading}
              className="ml-3 flex items-center space-x-1 px-3 py-1 text-xs bg-primary-50 text-primary-700 rounded hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDocumentLoading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b border-primary-700"></div>
              ) : (
                <Eye className="w-3 h-3" />
              )}
              <span>{isDocumentLoading ? "Loading..." : "View Document"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
