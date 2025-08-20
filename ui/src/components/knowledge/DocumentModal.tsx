import React from "react";
import { X, Download, Trash2, FileText, File } from "lucide-react";
import { type Document } from "@ewestern/connect_hub_sdk";

interface DocumentModalProps {
  document: Document | null;
  onClose: () => void;
  onDelete?: (document: Document) => void;
  isDeleting?: boolean;
  uploaderMemberships?: Record<string, string>;
  showDeleteButton?: boolean;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  document,
  onClose,
  onDelete,
  isDeleting = false,
  uploaderMemberships = {},
  showDeleteButton = false,
}) => {
  if (!document) return null;

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) {
      return <FileText className="w-12 h-12 text-red-500" />;
    } else if (mimeType.includes("word") || mimeType.includes("document")) {
      return <FileText className="w-12 h-12 text-blue-500" />;
    } else if (mimeType.includes("sheet") || mimeType.includes("excel")) {
      return <FileText className="w-12 h-12 text-green-500" />;
    } else {
      return <File className="w-12 h-12 text-slate-500" />;
    }
  };

  const handleDeleteClick = () => {
    if (onDelete) {
      onDelete(document);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {document.title || "Untitled Document"}
            </h2>
            <p className="text-sm text-slate-600">
              {document.mimeType?.split("/")[1]?.toUpperCase() ||
                "DOCUMENT"}{" "}
              • Modified{" "}
              {new Date(document.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex h-96">
          {/* Document preview area */}
          <div className="flex-1 bg-slate-50 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-4">
                {getFileIcon(document.mimeType || "")}
              </div>
              <p className="text-slate-600 mt-2">
                Document preview not available
              </p>
              <div className="mt-3 flex space-x-2 justify-center">
                <button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
                {showDeleteButton && onDelete && (
                  <button
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b border-white mr-2"></div>
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar with document info */}
          <div className="w-80 bg-white border-l border-slate-200 p-6">
            <h3 className="text-lg font-medium text-slate-800 mb-4">
              Document Info
            </h3>
            <div className="space-y-4">
              {uploaderMemberships[document.uploaderUserId] && (
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Uploaded By
                  </label>
                  <p className="text-sm text-slate-800">
                    {uploaderMemberships[document.uploaderUserId] || "Unknown"}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Last Modified
                </label>
                <p className="text-sm text-slate-800">
                  {new Date(document.updatedAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  File Size
                </label>
                <p className="text-sm text-slate-800">
                  {document.sizeBytes
                    ? `${Math.round(parseInt(document.sizeBytes) / 1024)} KB`
                    : "Unknown"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  File Type
                </label>
                <p className="text-sm text-slate-800">
                  {document.mimeType?.split("/")[1]?.toUpperCase() ||
                    "DOCUMENT"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
