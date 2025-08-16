import React, { useState, useCallback } from "react";
import { Search, BookOpen, Bot } from "lucide-react";
import {
  Configuration,
  type Document,
  ProxyApi,
} from "@ewestern/connect_hub_sdk";

interface KnowledgeSnippet {
  id: string;
  content: string | null;
  metadata?: Record<string, unknown>;
  similarity: number;
  documentId?: string;
}

interface KnowledgeSearchResult {
  documents: KnowledgeSnippet[];
}

interface KnowledgeTabProps {
  getConnectHubConfig: () => Configuration;
  documents: Document[];
  onDocumentClick: () => void;
}

export const KnowledgeTab: React.FC<KnowledgeTabProps> = ({
  getConnectHubConfig,
  documents,
  onDocumentClick,
}) => {
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeSnippet[]>(
    [],
  );
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Knowledge search functionality
  const searchKnowledge = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setKnowledgeResults([]);
        setHasSearched(false);
        return;
      }

      setKnowledgeLoading(true);
      setHasSearched(true);
      try {
        const config = getConnectHubConfig();
        const proxyApi = new ProxyApi(config);

        const result = (await proxyApi.proxyProviderIdCapabilityIdPost({
          providerId: "internal",
          capabilityId: "knowledge.search",
          proxyProviderIdCapabilityIdPostRequest: {
            // TODO: In Phase 2, backend can derive these from JWT
            orgId: "", // Will be derived from auth token
            userId: "", // Will be derived from auth token
            params: {
              query,
              limit: 20,
              threshold: 0.7,
            },
          },
        })) as KnowledgeSearchResult;

        setKnowledgeResults(result.documents || []);
      } catch (error) {
        console.error("Knowledge search failed:", error);
        setKnowledgeResults([]);
      } finally {
        setKnowledgeLoading(false);
      }
    },
    [getConnectHubConfig],
  );

  // Handle explicit search action
  const handleKnowledgeSearch = useCallback(() => {
    searchKnowledge(searchQuery);
  }, [searchKnowledge, searchQuery]);

  // Handle Enter key in knowledge search input
  const handleKnowledgeSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleKnowledgeSearch();
      }
    },
    [handleKnowledgeSearch],
  );

  const renderSnippetCard = (snippet: KnowledgeSnippet) => {
    const hasDocument = snippet.documentId;
    const relatedDoc = hasDocument
      ? documents.find((d) => d.documentId === snippet.documentId)
      : null;

    return (
      <div
        key={snippet.id}
        className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
      >
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
          <p className="text-sm text-slate-800 leading-relaxed line-clamp-4">
            {snippet.content || "No preview available"}
          </p>
        </div>

        {hasDocument && relatedDoc && (
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {relatedDoc.title || "Untitled Document"}
                </p>
                <p className="text-xs text-slate-500">
                  {relatedDoc.mimeType?.split("/")[1]?.toUpperCase() ||
                    "DOCUMENT"}
                </p>
              </div>
              <button
                onClick={() => onDocumentClick()}
                className="ml-3 px-3 py-1 text-xs bg-primary-50 text-primary-700 rounded hover:bg-primary-100"
              >
                Open Document
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              Smart Search
            </h1>
            <p className="text-slate-600 mt-1">
              Ask natural language questions to get answers from your documents
              and actions taken by agents
            </p>
          </div>
        </div>

        {/* Knowledge Search Input */}
        <div className="mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder=""
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKnowledgeSearchKeyDown}
              className="w-full pl-10 pr-20 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={handleKnowledgeSearch}
              disabled={!searchQuery.trim() || knowledgeLoading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {knowledgeLoading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
              ) : (
                "Search"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {!hasSearched ? (
            <div className="text-center py-12 px-6">
              <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">
                Ask anything about your knowledge
              </h3>
              <div className="max-w-md mx-auto">
                <p className="text-slate-600 mb-4">
                  Use natural language to find answers from your uploaded
                  documents and actions your agents have taken.
                </p>
                <div className="text-left text-sm text-slate-700 space-y-2">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="font-medium text-slate-800 mb-1">
                      Try asking:
                    </p>
                    <ul className="space-y-1 text-slate-600">
                      <li>• "What are our company policies on remote work?"</li>
                      <li>• "Show me recent sales data from the reports"</li>
                      <li>• "What emails has the agent sent this week?"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : knowledgeLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Finding answers...</p>
            </div>
          ) : knowledgeResults.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">
                No results found
              </h3>
              <p className="text-slate-600">
                Try rephrasing your question or check if there are relevant
                documents uploaded or agent actions available
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">
                  Found {knowledgeResults.length} relevant answers
                </p>
              </div>
              {knowledgeResults.map((snippet) => renderSnippetCard(snippet))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
