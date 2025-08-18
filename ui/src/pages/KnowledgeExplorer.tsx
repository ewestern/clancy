import React, { useState, useCallback } from "react";
import { FileText, Search } from "lucide-react";
import { Configuration } from "@ewestern/connect_hub_sdk";
import { useAuth } from "@clerk/react-router";
import { DocumentsTab } from "../components/knowledge/DocumentsTab";
import { KnowledgeTab } from "../components/knowledge/KnowledgeTab";

type TabType = "documents" | "knowledge";

const KnowledgeExplorer: React.FC = () => {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("documents");

  const getConnectHubConfig = useCallback(() => {
    return new Configuration({
      basePath: import.meta.env.VITE_CONNECT_HUB_URL,
      accessToken: getToken() as Promise<string>,
    });
  }, [getToken]);

  const handleDocumentClick = useCallback(() => {
    // This will be handled by the DocumentsTab component internally
    // But we can also handle cross-tab navigation here if needed
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Top-level Tab Navigation */}
      <div className="bg-white border-b border-slate-200 px-6 pt-6">
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "documents"
                ? "bg-primary-100 text-primary-800"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Documents
          </button>
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "knowledge"
                ? "bg-primary-100 text-primary-800"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Search className="w-4 h-4 inline mr-2" />
            Knowledge
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === "documents" ? (
          <DocumentsTab getConnectHubConfig={getConnectHubConfig} />
        ) : (
          <KnowledgeTab
            getConnectHubConfig={getConnectHubConfig}
            documents={[]}
            onDocumentClick={handleDocumentClick}
          />
        )}
      </div>
    </div>
  );
};

export default KnowledgeExplorer;
