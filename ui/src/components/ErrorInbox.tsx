import React, { useState, useEffect, useRef } from "react";
import { Bell, AlertTriangle, RotateCcw, FileText, X } from "lucide-react";
import { fetchErrors, retryRun } from "../api/stubs";
import { useNavigate } from "react-router-dom";

interface ErrorItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  errorSnippet: string;
  runId: string;
  timestamp: string;
  severity: "low" | "medium" | "high";
}

const ErrorInbox: React.FC = () => {
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadErrors = async () => {
      try {
        const data = await fetchErrors();
        setErrors(data);
      } catch (error) {
        console.error("Failed to load errors:", error);
      }
    };

    loadErrors();

    // Poll for new errors every 30 seconds
    const interval = setInterval(loadErrors, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRetry = async (errorId: string, runId: string) => {
    setRetryingIds((prev) => new Set(prev).add(errorId));
    try {
      await retryRun(runId);
      // Remove the error from the list after successful retry
      setErrors((prev) => prev.filter((error) => error.id !== errorId));
    } catch (error) {
      console.error("Failed to retry run:", error);
    } finally {
      setRetryingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(errorId);
        return newSet;
      });
    }
  };

  const handleOpenLog = (employeeId: string, runId: string) => {
    // Navigate to employee profile with activity filter
    navigate(`/employee/${employeeId}?tab=activity&run=${runId}`);
    setIsOpen(false);
  };

  const handleDismiss = (errorId: string) => {
    setErrors((prev) => prev.filter((error) => error.id !== errorId));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-amber-600 bg-amber-50 border-amber-200";
      default:
        return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  const hasErrors = errors.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon with notification dot */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        title={
          hasErrors
            ? `${errors.length} error${errors.length !== 1 ? "s" : ""}`
            : "No errors"
        }
      >
        <Bell className="w-5 h-5" />
        {hasErrors && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold leading-none">
              {errors.length > 9 ? "9+" : errors.length}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-800">
                Error Inbox {hasErrors && `(${errors.length})`}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {errors.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-medium text-slate-800 mb-1">
                  All good!
                </h4>
                <p className="text-xs text-slate-500">
                  No errors to report right now.
                </p>
              </div>
            ) : (
              <div className="py-2">
                {errors.map((error) => (
                  <div
                    key={error.id}
                    className={`mx-2 mb-2 p-3 border rounded-lg ${getSeverityColor(error.severity)}`}
                  >
                    {/* Error Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{error.employeeAvatar}</span>
                        <div>
                          <h4 className="text-sm font-medium text-slate-800">
                            {error.employeeName}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {new Date(error.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDismiss(error.id)}
                        className="text-slate-400 hover:text-slate-600"
                        title="Dismiss"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Error Message */}
                    <div className="mb-3">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-current flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {error.errorSnippet}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRetry(error.id, error.runId)}
                        disabled={retryingIds.has(error.id)}
                        className="inline-flex items-center px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <RotateCcw
                          className={`w-3 h-3 mr-1 ${retryingIds.has(error.id) ? "animate-spin" : ""}`}
                        />
                        {retryingIds.has(error.id) ? "Retrying..." : "Retry"}
                      </button>
                      <button
                        onClick={() =>
                          handleOpenLog(error.employeeId, error.runId)
                        }
                        className="inline-flex items-center px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Open Log
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {hasErrors && (
            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setErrors([])}
                className="text-xs text-slate-600 hover:text-slate-800"
              >
                Clear all errors
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorInbox;
