import React, { useState, useEffect, useCallback } from "react";
import { Clock, Check, X, MessageSquare, AlertTriangle } from "lucide-react";
import {
  ApprovalsApi,
  ApprovalRequest,
  ApprovalRequestStatusEnum,
  Configuration,
} from "@clancy/agents_core_sdk";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
//import updateLocale from 'dayjs/plugin/updateLocale';

dayjs.extend(relativeTime);
//dayjs.extend(updateLocale);
const agentsCoreUrl = import.meta.env.VITE_AGENTS_CORE_URL;

const ApprovalsQueue: React.FC = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  //const { getToken } = useAuth();
  const getClient = useCallback(() => {
    //const token = getToken();
    const configuration = new Configuration({
      basePath: agentsCoreUrl,
      //headers: { Authorization: `Bearer ${token}` },
    });
    return new ApprovalsApi(configuration);
  }, []);

  useEffect(() => {
    const client = getClient();
    const loadRequests = async () => {
      try {
        const response = await client.v1ApprovalsGet({
          status: ApprovalRequestStatusEnum.Pending,
        });
        setRequests(response);
      } catch (error) {
        console.error("Failed to load approval requests:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, []);

  const handleApprove = async (requestId: string) => {
    setProcessingIds((prev) => new Set(prev).add(requestId));
    const client = getClient();
    try {
      await client.v1ApprovalsIdPut({
        id: requestId,
        v1ApprovalsIdPutRequest: {
          status: ApprovalRequestStatusEnum.Approved,
        },
      });
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (error) {
      console.error("Failed to approve request:", error);
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingIds((prev) => new Set(prev).add(requestId));
    const client = getClient();
    try {
      await client.v1ApprovalsIdPut({
        id: requestId,
        v1ApprovalsIdPutRequest: {
          status: ApprovalRequestStatusEnum.Rejected,
        },
      });
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (error) {
      console.error("Failed to reject request:", error);
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleOpenChat = (request: ApprovalRequest) => {
    console.log("Opening chat for request:", request.id);
    // TODO: Open Chat & Approval Drawer
  };

  enum TimeElapsed {
    Recent = "recent",
    Delayed = "delayed",
    Overdue = "overdue",
  }

  // return *BOTH* the enum and the time elapsed
  const formatTimeElapsed = (timestamp: string) => {
    const formatted = dayjs(timestamp).fromNow(false);
    const requestTime = new Date(timestamp);
    const now = new Date();
    const timeElapsed = now.getTime() - requestTime.getTime();
    if (timeElapsed < 6 * 60 * 60 * 1000) {
      return { category: TimeElapsed.Recent, timeElapsed: formatted };
    } else if (timeElapsed < 24 * 60 * 60 * 1000) {
      return { category: TimeElapsed.Delayed, timeElapsed: formatted };
    } else {
      return { category: TimeElapsed.Overdue, timeElapsed: formatted };
    }
  };

  const getTimeElapsedPillStyle = (category: TimeElapsed) => {
    switch (category) {
      case TimeElapsed.Recent:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case TimeElapsed.Delayed:
        return "bg-amber-100 text-amber-800 border-amber-200";
      case TimeElapsed.Overdue:
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800">
            Approvals Queue
          </h1>
          <p className="text-slate-600 mt-1">
            Review and approve pending AI employee requests
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-600">
            {requests.length} pending
          </span>
          {requests.some((req) => {
            const timeInfo = formatTimeElapsed(req.createdAt!);
            return timeInfo.category === TimeElapsed.Overdue;
          }) && (
            <div className="flex items-center space-x-1 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Overdue items</span>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              All caught up!
            </h3>
            <p className="text-slate-600">
              No pending approvals at the moment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Request ID
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Summary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Time Elapsed
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {requests.map((request) => {
                  const timeInfo = formatTimeElapsed(request.createdAt!);
                  const isProcessing = processingIds.has(request.id || "");

                  return (
                    <tr
                      key={request.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => handleOpenChat(request)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-800">
                          #{request.id?.toUpperCase()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-800 max-w-md">
                          {request.summary}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(request.createdAt!).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTimeElapsedPillStyle(timeInfo.category)}`}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {timeInfo.timeElapsed}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenChat(request);
                            }}
                            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                            title="Open Chat"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(request.id!);
                            }}
                            disabled={isProcessing}
                            className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            {isProcessing ? "Processing..." : "Approve"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(request.id!);
                            }}
                            disabled={isProcessing}
                            className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <X className="w-3 h-3 mr-1" />
                            {isProcessing ? "Processing..." : "Reject"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {requests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-2xl font-semibold text-slate-800">
              {requests.length}
            </div>
            <div className="text-sm text-slate-600">Total Pending</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-2xl font-semibold text-amber-600">
              {
                requests.filter((req) => {
                  const timeInfo = formatTimeElapsed(req.createdAt!);
                  return timeInfo.category === TimeElapsed.Delayed;
                }).length
              }
            </div>
            <div className="text-sm text-slate-600">Urgent (&lt; 1h)</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-2xl font-semibold text-red-600">
              {
                requests.filter((req) => {
                  const timeInfo = formatTimeElapsed(req.createdAt!);
                  return timeInfo.category === TimeElapsed.Overdue;
                }).length
              }
            </div>
            <div className="text-sm text-slate-600">Overdue</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalsQueue;
