import React from "react";
import { AlertCircle, Eye } from "lucide-react";

interface KnowledgeItem {
  id: string;
  fact: string;
  sourceNode: string;
  lastReferenced: string;
  visibility: "public" | "finance" | "sales" | "private";
}

interface KnowledgeTabProps {
  knowledge: KnowledgeItem[];
  loading: boolean;
  error: string | undefined;
  onRetry: () => void;
}

const KnowledgeTab: React.FC<KnowledgeTabProps> = ({
  knowledge,
  loading,
  error,
  onRetry,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-800">Knowledge Base</h3>
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
            <span className="text-sm text-slate-500">Loading...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <select className="text-sm border border-slate-300 rounded px-3 py-1">
              <option>All scopes</option>
              <option>Finance</option>
              <option>Sales</option>
              <option>Public</option>
            </select>
            <input
              type="date"
              className="text-sm border border-slate-300 rounded px-3 py-1"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={onRetry}
                className="text-sm text-red-700 hover:text-red-900 underline mt-1"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-3"></div>
          <p>Loading knowledge base...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-slate-500">
          <p>Knowledge information is currently unavailable.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Fact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Source Node
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Last Referenced
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Visibility
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {knowledge.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    No knowledge items found
                  </td>
                </tr>
              ) : (
                knowledge.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                      {item.fact}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {item.sourceNode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {item.lastReferenced}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.visibility === "public"
                            ? "bg-green-100 text-green-800"
                            : item.visibility === "finance"
                              ? "bg-blue-100 text-blue-800"
                              : item.visibility === "sales"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        {item.visibility}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default KnowledgeTab;
