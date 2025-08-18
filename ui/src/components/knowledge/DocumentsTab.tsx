import React, { useState, useEffect, useCallback } from "react";
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
  Trash2,
} from "lucide-react";
import {
  DocumentsApi,
  Configuration,
  type Document,
  TagsApi,
  Tag,
  DocumentsGetRequest,
} from "@ewestern/connect_hub_sdk";
import { useOrganization } from "@clerk/react-router";

interface TagNode {
  id: string;
  name: string;
  count: number;
  children?: TagNode[];
}

interface DocumentsTabProps {
  getConnectHubConfig: () => Configuration;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  getConnectHubConfig,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(["all", "tags"]),
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [showTagInput, setShowTagInput] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Document | null>(
    null,
  );
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { organization } = useOrganization();
  // Manual tags API calls (until SDK is regenerated)
  const fetchTags = useCallback(async () => {
    const config = getConnectHubConfig();
    const tagsApi = new TagsApi(config);
    return tagsApi.tagsGet();
  }, [getConnectHubConfig]);
  const addTagToDocument = useCallback(
    async (documentId: string, tagId: string) => {
      const config = getConnectHubConfig();
      const tagsApi = new TagsApi(config);
      return tagsApi.documentsDocumentIdTagsPost({
        documentId,
        documentsDocumentIdTagsPostRequest: {
          tagId: tagId,
        },
      });
    },
    [getConnectHubConfig],
  );

  const removeTagFromDocument = useCallback(
    async (documentId: string, tagId: string) => {
      const config = getConnectHubConfig();
      const tagsApi = new TagsApi(config);
      return tagsApi.documentsDocumentIdTagsTagIdDelete({
        documentId,
        tagId,
      });
    },
    [getConnectHubConfig],
  );

  // Build dynamic tag tree from flat tags using dot notation
  const buildTagTree = (tags: Tag[]): TagNode[] => {
    const tagMap = new Map<string, TagNode>();

    tags.forEach((tag) => {
      const parts = tag.name.split(".");
      let currentPath = "";

      parts.forEach((part) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}.${part}` : part;

        if (!tagMap.has(currentPath)) {
          tagMap.set(currentPath, {
            id: currentPath,
            name: part,
            count: 0,
            children: [],
          });
        }

        if (parentPath && tagMap.has(parentPath)) {
          const parent = tagMap.get(parentPath)!;
          const child = tagMap.get(currentPath)!;
          if (!parent.children!.find((c) => c.id === child.id)) {
            parent.children!.push(child);
          }
        }
      });
    });

    // Return only root level tags (no dots)
    return Array.from(tagMap.values()).filter((tag) => !tag.id.includes("."));
  };

  const tagTree = buildTagTree(tags);
  useEffect(() => {
    const loadMemberships = async () => {
      const memberships = await organization?.getMemberships();
      const map = memberships?.data.reduce(
        (acc, membership) => {
          if (membership?.publicUserData?.userId) {
            const fullName = `${membership.publicUserData.firstName} ${membership.publicUserData.lastName}`;
            acc[membership.publicUserData.userId] = fullName;
          }
          return acc;
        },
        {} as Record<string, string>,
      );
      setMemberships(map!);
    };
    loadMemberships();
  }, [organization]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const config = getConnectHubConfig();
        const documentsApi = new DocumentsApi(config);

        // Load documents and tags in parallel
        const [documentsResponse, tagsData] = await Promise.all([
          documentsApi.documentsGet(),
          fetchTags(),
        ]);

        setDocuments(documentsResponse.data);
        setFilteredDocuments(documentsResponse.data);
        setTags(tagsData.data);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
        setTagsLoading(false);
      }
    };

    loadData();
  }, [getConnectHubConfig, fetchTags]);

  const refreshDocuments = useCallback(async () => {
    try {
      const config = getConnectHubConfig();
      const documentsApi = new DocumentsApi(config);
      const [documentsResponse, tagsData] = await Promise.all([
        documentsApi.documentsGet(),
        fetchTags(),
      ]);
      setDocuments(documentsResponse.data);
      setFilteredDocuments(documentsResponse.data);
      setTags(tagsData.data);
    } catch (error) {
      console.error("Failed to refresh documents:", error);
    }
  }, [getConnectHubConfig, fetchTags]);

  const handleUploadClick = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadDocument(file);
    // reset input so same file can be reselected if desired
    event.target.value = "";
  };

  const uploadDocument = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const config = getConnectHubConfig();
      const documentsApi = new DocumentsApi(config);

      // 1) Get presigned URL
      const presign = await documentsApi.documentsPresignPost({
        documentsPresignPostRequest: {
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          ownershipScope: "organization",
        },
      });

      // 2) Upload to S3 via PUT
      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`S3 upload failed with status ${putRes.status}`);
      }

      // 3) Finalize
      await documentsApi.documentsFinalizePost({
        documentsFinalizePostRequest: {
          documentId: presign.documentId,
          key: presign.key,
        },
      });

      // 4) Refresh list
      await refreshDocuments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploadError(message);
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Filter documents based on selected filter, tags, and search
  useEffect(() => {
    const applyFilters = async () => {
      const config = getConnectHubConfig();
      const documentsApi = new DocumentsApi(config);
      const req: DocumentsGetRequest = {};
      if (selectedTags.length > 0) {
        req.tags = selectedTags;
      }
      if (searchQuery) {
        req.q = searchQuery;
      }
      const response = await documentsApi.documentsGet(req);
      setFilteredDocuments(response.data);

      // Filter by ownership scope (client-side)
      if (selectedFilter === "my-documents") {
        // TODO: Filter by current user ID when available
        setFilteredDocuments(
          response.data.filter((doc) => doc.ownershipScope === "user"),
        );
      } else if (selectedFilter === "organization") {
        setFilteredDocuments(
          response.data.filter((doc) => doc.ownershipScope === "organization"),
        );
      }
    };
    applyFilters();
  }, [
    documents,
    selectedFilter,
    selectedTags,
    searchQuery,
    getConnectHubConfig,
    refreshDocuments,
  ]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (mimeType.includes("word") || mimeType.includes("document")) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    } else if (mimeType.includes("sheet") || mimeType.includes("excel")) {
      return <FileText className="w-5 h-5 text-green-500" />;
    } else {
      return <File className="w-5 h-5 text-slate-500" />;
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleDocumentClick = (doc: Document) => {
    setSelectedDocument(doc);
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagName)) {
        return prev.filter((t) => t !== tagName);
      } else {
        return [...prev, tagName];
      }
    });
  };

  const handleAddTag = async (documentId: string) => {
    if (!newTagName.trim()) return;

    const success = await addTagToDocument(documentId, newTagName.trim());
    if (success) {
      setNewTagName("");
      setShowTagInput(null);
      await refreshDocuments(); // Refresh to see the new tag
    }
  };

  const handleDeleteDocument = async (document: Document) => {
    setIsDeleting(document.documentId);
    const config = getConnectHubConfig();
    const documentsApi = new DocumentsApi(config);

    try {
      await documentsApi.documentsDocumentIdDelete({
        documentId: document.documentId,
      });

      // Close any open modals
      setShowDeleteConfirm(null);
      setSelectedDocument(null);

      // Refresh the documents list
      await refreshDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      // You might want to add a toast notification here
    } finally {
      setIsDeleting(null);
    }
  };

  const renderTagNode = (node: TagNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedTags.includes(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer hover:bg-slate-100 ${
            isSelected ? "bg-primary-50 text-primary-600" : "text-slate-700"
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => {
            toggleTag(node.id);
            if (hasChildren) {
              toggleNode(node.id);
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
            {node.children?.map((child) => renderTagNode(child, depth + 1))}
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
    <div className="flex h-full">
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
          <div className="space-y-4">
            {/* Filter Section */}
            <div>
              <h3 className="text-sm font-medium text-slate-800 mb-2">
                Filters
              </h3>
              <div className="space-y-1">
                <div
                  className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer hover:bg-slate-100 ${
                    selectedFilter === "all"
                      ? "bg-primary-50 text-primary-600"
                      : "text-slate-700"
                  }`}
                  onClick={() => setSelectedFilter("all")}
                >
                  <span className="flex-1 text-sm font-medium">
                    All Documents
                  </span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {documents.length}
                  </span>
                </div>
                <div
                  className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer hover:bg-slate-100 ${
                    selectedFilter === "my-documents"
                      ? "bg-primary-50 text-primary-600"
                      : "text-slate-700"
                  }`}
                  onClick={() => setSelectedFilter("my-documents")}
                >
                  <span className="flex-1 text-sm font-medium">
                    My Documents
                  </span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {
                      documents.filter((d) => d.ownershipScope === "user")
                        .length
                    }
                  </span>
                </div>
                <div
                  className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer hover:bg-slate-100 ${
                    selectedFilter === "organization"
                      ? "bg-primary-50 text-primary-600"
                      : "text-slate-700"
                  }`}
                  onClick={() => setSelectedFilter("organization")}
                >
                  <span className="flex-1 text-sm font-medium">
                    Organization
                  </span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {
                      documents.filter(
                        (d) => d.ownershipScope === "organization",
                      ).length
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Tags Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-800">Tags</h3>
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              {tagsLoading ? (
                <div className="text-xs text-slate-500">Loading tags...</div>
              ) : tagTree.length === 0 ? (
                <div className="text-xs text-slate-500">No tags yet</div>
              ) : (
                <div className="space-y-1">
                  {tagTree.map((node) => renderTagNode(node))}
                </div>
              )}
            </div>
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
                {selectedFilter === "all"
                  ? "All Documents"
                  : selectedFilter === "my-documents"
                    ? "My Documents"
                    : "Organization Documents"}
              </h1>
              <div className="mt-1">
                <p className="text-slate-600">
                  {filteredDocuments.length} documents
                </p>
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full"
                      >
                        {tag}
                        <button
                          onClick={() => toggleTag(tag)}
                          className="ml-1 text-primary-600 hover:text-primary-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.csv,.ppt,.pptx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleFileSelected}
              />
              <button
                className="inline-flex items-center px-3 py-1.5 text-sm border border-slate-300 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
                onClick={handleUploadClick}
                disabled={isUploading}
                title={isUploading ? "Uploading..." : "Upload a document"}
              >
                {isUploading ? (
                  <span className="flex items-center">
                    <span className="mr-2 h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Uploading
                  </span>
                ) : (
                  <span>Upload</span>
                )}
              </button>
            </div>
          </div>
          {uploadError && (
            <div className="mt-3 text-sm text-red-600">{uploadError}</div>
          )}
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12 px-6">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">
                {searchQuery
                  ? "No documents found"
                  : "Upload your first document"}
              </h3>
              {searchQuery ? (
                <p className="text-slate-600">
                  Try adjusting your search terms
                </p>
              ) : (
                <div className="max-w-md mx-auto">
                  <p className="text-slate-600 mb-4">
                    Empower your AI employees with your knowledge. Upload
                    documents to:
                  </p>
                  <div className="text-left space-y-2 text-sm text-slate-700 mb-6">
                    <div className="flex items-start space-x-2">
                      <span className="text-primary-600 font-medium">•</span>
                      <span>
                        Enable employees to answer questions using your specific
                        information
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-primary-600 font-medium">•</span>
                      <span>
                        Make your data searchable through natural language
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-primary-600 font-medium">•</span>
                      <span>
                        Create a centralized knowledge base for your team
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-primary-600 font-medium">•</span>
                      <span>
                        Provide context for more accurate employee responses
                      </span>
                    </div>
                  </div>
                  <button
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    onClick={handleUploadClick}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <span className="flex items-center">
                        <span className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Uploading...
                      </span>
                    ) : (
                      <span>Upload Document</span>
                    )}
                  </button>
                </div>
              )}
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
                        {getFileIcon(doc.mimeType || "")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-800 truncate">
                          {doc.title || "Untitled Document"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {doc.mimeType?.split("/")[1]?.toUpperCase() ||
                            "DOCUMENT"}{" "}
                          •{" "}
                          {doc.sizeBytes
                            ? `${Math.round(parseInt(doc.sizeBytes) / 1024)} KB`
                            : "Unknown size"}
                        </p>
                        <p className="text-xs text-slate-600 mt-2">
                          Modified{" "}
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          by {memberships[doc.uploaderUserId] || "Unknown"}
                        </p>
                      </div>
                    </div>
                    {/* Tags section */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {doc.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-full"
                          >
                            {tag.name}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                // Find tag ID and remove
                                const tagId = doc.tags.find(
                                  (t) => t.name === tag.name,
                                )?.id;
                                if (tagId) {
                                  const success = await removeTagFromDocument(
                                    doc.documentId,
                                    tagId,
                                  );
                                  if (success) await refreshDocuments();
                                }
                              }}
                              className="ml-1 text-slate-500 hover:text-slate-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        {showTagInput === doc.documentId ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              value={newTagName}
                              onChange={(e) => setNewTagName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddTag(doc.documentId);
                                } else if (e.key === "Escape") {
                                  setShowTagInput(null);
                                  setNewTagName("");
                                }
                              }}
                              placeholder="Tag name"
                              className="text-xs px-2 py-1 border border-slate-300 rounded w-20"
                              autoFocus
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddTag(doc.documentId);
                              }}
                              className="text-xs text-primary-600 hover:text-primary-800"
                            >
                              Add
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTagInput(doc.documentId);
                              setNewTagName("");
                            }}
                            className="inline-flex items-center px-2 py-1 text-xs text-slate-500 border border-dashed border-slate-300 rounded-full hover:border-slate-400"
                          >
                            + Tag
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            doc.ownershipScope === "organization"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {String(doc.ownershipScope) || "unknown"}
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
                          <button
                            className="p-1 text-slate-400 hover:text-red-600"
                            title="Delete document"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(doc);
                            }}
                            disabled={isDeleting === doc.documentId}
                          >
                            {isDeleting === doc.documentId ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-red-600"></div>
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
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
                  {selectedDocument.title || "Untitled Document"}
                </h2>
                <p className="text-sm text-slate-600">
                  {selectedDocument.mimeType?.split("/")[1]?.toUpperCase() ||
                    "DOCUMENT"}{" "}
                  • Modified{" "}
                  {new Date(selectedDocument.updatedAt).toLocaleDateString()}
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
                  {getFileIcon(selectedDocument.mimeType || "")}
                  <p className="text-slate-600 mt-2">
                    Document preview not available
                  </p>
                  <div className="mt-3 flex space-x-2">
                    <button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </button>
                    <button
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      onClick={() => setShowDeleteConfirm(selectedDocument)}
                      disabled={isDeleting === selectedDocument.documentId}
                    >
                      {isDeleting === selectedDocument.documentId ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b border-white mr-2"></div>
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Delete
                    </button>
                  </div>
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
                      Uploaded By
                    </label>
                    <p className="text-sm text-slate-800">
                      {memberships[selectedDocument.uploaderUserId] ||
                        "Unknown"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Last Modified
                    </label>
                    <p className="text-sm text-slate-800">
                      {new Date(selectedDocument.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      File Size
                    </label>
                    <p className="text-sm text-slate-800">
                      {selectedDocument.sizeBytes
                        ? `${Math.round(parseInt(selectedDocument.sizeBytes) / 1024)} KB`
                        : "Unknown"}
                    </p>
                  </div>

                  {/*
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
                  */}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Delete Document
              </h3>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="text-slate-400 hover:text-slate-600"
                disabled={isDeleting === showDeleteConfirm.documentId}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-slate-600 mb-2">
                Are you sure you want to delete this document?
              </p>
              <div className="bg-slate-50 p-3 rounded border">
                <p className="font-medium text-slate-800">
                  {showDeleteConfirm.title || "Untitled Document"}
                </p>
                <p className="text-sm text-slate-600">
                  {showDeleteConfirm.mimeType?.split("/")[1]?.toUpperCase() ||
                    "DOCUMENT"}{" "}
                  •{" "}
                  {showDeleteConfirm.sizeBytes
                    ? `${Math.round(parseInt(showDeleteConfirm.sizeBytes) / 1024)} KB`
                    : "Unknown size"}
                </p>
              </div>
              <p className="text-sm text-red-600 mt-3">
                This action cannot be undone. The document and all related
                knowledge snippets will be permanently deleted.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
                disabled={isDeleting === showDeleteConfirm.documentId}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDocument(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                disabled={isDeleting === showDeleteConfirm.documentId}
              >
                {isDeleting === showDeleteConfirm.documentId ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b border-white mr-2"></div>
                    Deleting...
                  </div>
                ) : (
                  "Delete Document"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
