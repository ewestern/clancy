import React, { useState, useEffect } from "react";
import {
  Search,
  FileText,
  Download,
  ExternalLink,
  FolderOpen,
  Folder,
  File,
  Filter,
  X,
} from "lucide-react";
import { fetchKnowledgeItems } from "../api/stubs";

interface DocumentItem {
  id: string;
  title: string;
  type: "pdf" | "doc" | "txt" | "xlsx";
  lastModified: string;
  scope: string;
  contributingEmployee: string;
  size?: string;
  url?: string;
}

interface ScopeNode {
  id: string;
  name: string;
  count: number;
  children?: ScopeNode[];
}

const KnowledgeExplorer: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentItem[]>(
    [],
  );
  const [selectedScope, setSelectedScope] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(
    null,
  );
  const [expandedScopes, setExpandedScopes] = useState<Set<string>>(
    new Set(["all"]),
  );

  // Mock scopes tree structure
  const scopeTree: ScopeNode[] = [
    {
      id: "all",
      name: "All Documents",
      count: 0,
    },
    {
      id: "finance",
      name: "Finance",
      count: 0,
      children: [
        { id: "finance.invoices", name: "Invoices", count: 0 },
        { id: "finance.reports", name: "Reports", count: 0 },
        { id: "finance.policies", name: "Policies", count: 0 },
      ],
    },
    {
      id: "sales",
      name: "Sales",
      count: 0,
      children: [
        { id: "sales.presentations", name: "Presentations", count: 0 },
        { id: "sales.proposals", name: "Proposals", count: 0 },
        { id: "sales.contracts", name: "Contracts", count: 0 },
      ],
    },
    {
      id: "support",
      name: "Support",
      count: 0,
      children: [
        { id: "support.guidelines", name: "Guidelines", count: 0 },
        { id: "support.faqs", name: "FAQs", count: 0 },
      ],
    },
    {
      id: "public",
      name: "Public",
      count: 0,
    },
  ];

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const data = await fetchKnowledgeItems();
        // Transform to DocumentItem format
        const docs: DocumentItem[] = data.map((item) => ({
          id: item.id,
          title: item.title,
          type: item.type as "pdf" | "doc" | "txt" | "xlsx",
          lastModified: item.lastModified,
          scope: item.scope,
          contributingEmployee: item.contributingEmployee,
          size: "2.4 MB", // Mock size
          url: "#",
        }));
        setDocuments(docs);
        setFilteredDocuments(docs);
      } catch (error) {
        console.error("Failed to load knowledge items:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, []);

  // Update counts in scope tree
  const updateScopeCounts = (
    tree: ScopeNode[],
    docs: DocumentItem[],
  ): ScopeNode[] => {
    return tree.map((node) => {
      const count =
        node.id === "all"
          ? docs.length
          : docs.filter(
              (doc) =>
                doc.scope === node.id || doc.scope.startsWith(node.id + "."),
            ).length;

      return {
        ...node,
        count,
        children: node.children
          ? updateScopeCounts(node.children, docs)
          : undefined,
      };
    });
  };

  const scopeTreeWithCounts = updateScopeCounts(scopeTree, documents);

  // Filter documents based on selected scope and search
  useEffect(() => {
    let filtered = documents;

    // Filter by scope
    if (selectedScope !== "all") {
      filtered = filtered.filter(
        (doc) =>
          doc.scope === selectedScope ||
          doc.scope.startsWith(selectedScope + "."),
      );
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.contributingEmployee
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
    }

    setFilteredDocuments(filtered);
  }, [documents, selectedScope, searchQuery]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-5 h-5 text-red-500" />;
      case "doc":
        return <FileText className="w-5 h-5 text-blue-500" />;
      case "xlsx":
        return <FileText className="w-5 h-5 text-green-500" />;
      default:
        return <File className="w-5 h-5 text-slate-500" />;
    }
  };

  const toggleScope = (scopeId: string) => {
    setExpandedScopes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(scopeId)) {
        newSet.delete(scopeId);
      } else {
        newSet.add(scopeId);
      }
      return newSet;
    });
  };

  const handleDocumentClick = (doc: DocumentItem) => {
    setSelectedDocument(doc);
  };

  const renderScopeNode = (node: ScopeNode, depth: number = 0) => {
    const isExpanded = expandedScopes.has(node.id);
    const isSelected = selectedScope === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer hover:bg-slate-100 ${
            isSelected ? "bg-primary-50 text-primary-600" : "text-slate-700"
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => {
            setSelectedScope(node.id);
            if (hasChildren) {
              toggleScope(node.id);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="w-4 h-4" />
            ) : (
              <Folder className="w-4 h-4" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
          <span className="flex-1 text-sm font-medium">{node.name}</span>
          <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
            {node.count}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children?.map((child) => renderScopeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Left Tree Pane */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-medium text-slate-800 mb-3">
            Knowledge Base
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {scopeTreeWithCounts.map((node) => renderScopeNode(node))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">
                {selectedScope === "all"
                  ? "All Documents"
                  : scopeTreeWithCounts.find((s) => s.id === selectedScope)
                      ?.name || selectedScope}
              </h1>
              <p className="text-slate-600 mt-1">
                {filteredDocuments.length} documents
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button className="inline-flex items-center px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </button>
              <select className="text-sm border border-slate-300 rounded px-3 py-1.5">
                <option>Sort by Modified</option>
                <option>Sort by Name</option>
                <option>Sort by Type</option>
              </select>
            </div>
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">
                No documents found
              </h3>
              <p className="text-slate-600">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "No documents in this scope"}
              </p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleDocumentClick(doc)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getFileIcon(doc.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-800 truncate">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {doc.type.toUpperCase()} • {doc.size}
                        </p>
                        <p className="text-xs text-slate-600 mt-2">
                          Modified{" "}
                          {new Date(doc.lastModified).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          by {doc.contributingEmployee}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          doc.scope === "finance"
                            ? "bg-blue-100 text-blue-800"
                            : doc.scope === "sales"
                              ? "bg-purple-100 text-purple-800"
                              : doc.scope === "support"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-green-100 text-green-800"
                        }`}
                      >
                        {doc.scope}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          className="p-1 text-slate-400 hover:text-slate-600"
                          title="Download"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          className="p-1 text-slate-400 hover:text-slate-600"
                          title="Open in new tab"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  {selectedDocument.title}
                </h2>
                <p className="text-sm text-slate-600">
                  {selectedDocument.type.toUpperCase()} • Modified{" "}
                  {new Date(selectedDocument.lastModified).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex h-96">
              {/* Document preview area */}
              <div className="flex-1 bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                  {getFileIcon(selectedDocument.type)}
                  <p className="text-slate-600 mt-2">
                    Document preview not available
                  </p>
                  <button className="mt-3 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                </div>
              </div>

              {/* Right sidebar with provenance */}
              <div className="w-80 bg-white border-l border-slate-200 p-6">
                <h3 className="text-lg font-medium text-slate-800 mb-4">
                  Document Info
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Contributing Employee
                    </label>
                    <p className="text-sm text-slate-800">
                      {selectedDocument.contributingEmployee}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Scope
                    </label>
                    <p className="text-sm text-slate-800">
                      {selectedDocument.scope}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Last Modified
                    </label>
                    <p className="text-sm text-slate-800">
                      {new Date(selectedDocument.lastModified).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      File Size
                    </label>
                    <p className="text-sm text-slate-800">
                      {selectedDocument.size}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-medium text-slate-800 mb-2">
                      Provenance Chain
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                        <span className="text-slate-600">Producing run</span>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                        <span className="text-slate-600">Processing node</span>
                      </div>
                      <div className="flex items-center space-x-2 ml-8">
                        <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                        <span className="text-slate-600">Original source</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeExplorer;
