import React from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Shield,
  Settings,
  CheckCircle,
  XCircle,
} from "lucide-react";

// Provider permission based on connections and capabilities
interface ProviderPermission {
  provider: string;
  providerId: string;
  connected: boolean;
  connectionId?: string;
  capabilities: Array<{
    id: string;
    displayName: string;
    description?: string;
    granted: boolean;
    required: boolean;
  }>;
}

interface PermissionsTabProps {
  permissions: ProviderPermission[];
  connectionsError: string | undefined;
  capabilitiesError: string | undefined;
}

const PermissionsTab: React.FC<PermissionsTabProps> = ({
  permissions,
  connectionsError,
  capabilitiesError,
}) => {
  const navigate = useNavigate();

  const getScopeStatusIcon = (scope: {
    granted: boolean;
    required: boolean;
  }) => {
    if (scope.required && scope.granted)
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (scope.required && !scope.granted)
      return <XCircle className="w-4 h-4 text-red-600" />;
    if (!scope.required && scope.granted)
      return <CheckCircle className="w-4 h-4 text-slate-400" />;
    return <div className="w-4 h-4 rounded-full bg-slate-200" />;
  };

  const getScopeStatusText = (scope: {
    granted: boolean;
    required: boolean;
  }) => {
    if (scope.required && scope.granted) return "Available";
    if (scope.required && !scope.granted) return "Missing";
    if (!scope.required && scope.granted) return "Available (Unused)";
    return "Not available";
  };

  const getScopeStatusColor = (scope: {
    granted: boolean;
    required: boolean;
  }) => {
    if (scope.required && scope.granted)
      return "text-emerald-700 bg-emerald-50";
    if (scope.required && !scope.granted) return "text-red-700 bg-red-50";
    if (!scope.required && scope.granted) return "text-slate-700 bg-slate-50";
    return "text-slate-500 bg-slate-50";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-800">
          Access & Capabilities
        </h3>
        <button
          onClick={() => navigate("/connections")}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Manage Connections →
        </button>
      </div>

      {(connectionsError || capabilitiesError) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm text-amber-800">
                {connectionsError && capabilitiesError
                  ? "Unable to load connection and capability information."
                  : connectionsError
                    ? "Unable to load connection information."
                    : "Unable to load capability information."}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Some permission details may be incomplete.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-amber-700 hover:text-amber-900 underline mt-1"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm text-blue-800">
              This view shows what capabilities this AI employee was designed to
              use and their current availability.
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Provider connections are managed globally on your{" "}
              <button
                onClick={() => navigate("/connections")}
                className="underline hover:no-underline font-medium"
              >
                Connections page
              </button>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Capability Overview Summary */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-800 mb-3">
          Capability Overview
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-800">
              {permissions.reduce(
                (total, provider) => total + provider.capabilities.length,
                0,
              )}
            </div>
            <div className="text-xs text-slate-600">Required</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {permissions.reduce(
                (total, provider) =>
                  total + provider.capabilities.filter((c) => c.granted).length,
                0,
              )}
            </div>
            <div className="text-xs text-slate-600">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-400">—</div>
            <div className="text-xs text-slate-600">Recently Used</div>
            <div className="text-xs text-slate-500 mt-1">(Coming soon)</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {permissions.map((provider) => {
          const hasRequiredMissing = provider.capabilities.some(
            (c) => c.required && !c.granted,
          );

          return (
            <div
              key={provider.providerId}
              className={`border rounded-lg p-4 ${
                hasRequiredMissing
                  ? "border-red-200 bg-red-50"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-lg">
                    <Settings className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800">
                      {provider.provider}
                    </h4>
                    <p className="text-sm text-slate-600">
                      Requires {provider.capabilities.length} capabilities •{" "}
                      {provider.capabilities.filter((c) => c.granted).length}{" "}
                      available
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      provider.connected
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {provider.connected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {provider.capabilities.map((capability, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-white rounded border border-slate-100"
                  >
                    <div className="flex items-center space-x-3">
                      {getScopeStatusIcon(capability)}
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {capability.displayName}
                        </p>
                        {capability.description && (
                          <p className="text-xs text-slate-600">
                            {capability.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-xs px-2 py-1 rounded ${getScopeStatusColor(capability)}`}
                    >
                      {getScopeStatusText(capability)}
                    </span>
                  </div>
                ))}
              </div>

              {hasRequiredMissing && (
                <div className="mt-3 p-3 bg-amber-100 rounded border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <strong>Missing capabilities:</strong> This AI employee
                    cannot access some required capabilities. Workflows may not
                    function as expected.
                  </p>
                  <button
                    onClick={() => navigate("/connections")}
                    className="text-sm text-amber-700 hover:text-amber-900 underline mt-1 font-medium"
                  >
                    Review connections →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PermissionsTab;
