import React from "react";
import { AlertCircle } from "lucide-react";

interface HealthMetrics {
  successRate: number;
  avgLatency: number;
  lastError: string | null;
  sparklineData: number[];
  nextRun: string;
  isPaused: boolean;
}

interface HealthMetricsProps {
  health: HealthMetrics | null;
  loading: boolean;
  error: string | undefined;
  onRetry: () => void;
}

const HealthMetrics: React.FC<HealthMetricsProps> = ({
  health,
  loading,
  error,
  onRetry,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-medium text-slate-800 mb-4">
        Health Metrics
      </h3>
      {loading ? (
        <div className="text-center py-8 text-slate-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-3"></div>
          <p className="text-sm">Loading health metrics...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-red-800 mb-2">Unable to load health metrics</p>
            <button
              onClick={onRetry}
              className="text-xs text-red-700 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
        </div>
      ) : health ? (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">
                Success Rate (30d)
              </span>
              <span className="text-sm font-medium text-slate-800">
                {health.successRate}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-success-500 h-2 rounded-full"
                style={{ width: `${health.successRate}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Avg Latency</span>
              <span className="text-sm font-medium text-slate-800">
                {health.avgLatency}ms
              </span>
            </div>
          </div>

          {health.lastError && (
            <div className="mt-4">
              <button className="flex items-center space-x-2 text-sm text-red-600 hover:text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span>Last error</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">No health data available</p>
        </div>
      )}
    </div>
  );
};

export default HealthMetrics;
