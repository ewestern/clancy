import React from "react";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { ConnectionStatus } from "@ewestern/connect_hub_sdk";

export type ConnectionCard = {
  id: string;
  providerId: string;
  displayName: string;
  status: ConnectionStatus;
  permissions: string[];
  capabilityDisplayNames: string[];
  triggerDisplayNames?: string[];
  providerIcon?: string;
  providerDisplayName?: string;
};

interface ConnectionCardProps {
  connection: ConnectionCard;
  onDisconnect: (connectionId: string) => void;
  onOpenPermissionsModal: (
    providerId: string,
    connection?: ConnectionCard,
  ) => void;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  onDisconnect,
  onOpenPermissionsModal,
}) => {
  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case ConnectionStatus.Active:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case ConnectionStatus.Error:
        return <XCircle className="h-5 w-5 text-red-500" />;
      case ConnectionStatus.Inactive:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: ConnectionStatus) => {
    switch (status) {
      case ConnectionStatus.Active:
        return "Connected";
      case ConnectionStatus.Inactive:
        return "Not Connected";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case ConnectionStatus.Active:
        return "text-green-700 bg-green-50 border-green-200";
      case ConnectionStatus.Inactive:
        return "text-red-700 bg-red-50 border-red-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-6">
        {/* Top section with provider info and action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {connection.providerIcon ? (
                  <>
                    <img
                      src={connection.providerIcon}
                      alt={
                        connection.providerDisplayName || connection.displayName
                      }
                      className="h-8 w-8"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        (
                          e.currentTarget.nextSibling as HTMLElement | null
                        )?.classList.remove("hidden");
                      }}
                    />
                    <span className="text-xl font-semibold text-gray-600 hidden">
                      {(
                        connection.providerDisplayName || connection.displayName
                      ).charAt(0)}
                    </span>
                  </>
                ) : (
                  <span className="text-xl font-semibold text-gray-600">
                    {(
                      connection.providerDisplayName || connection.displayName
                    ).charAt(0)}
                  </span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {connection.providerDisplayName || connection.displayName}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(connection.status)}`}
            >
              {getStatusIcon(connection.status)}
              <span className="ml-2">{getStatusText(connection.status)}</span>
            </div>
            {connection.status === ConnectionStatus.Active && (
              <button
                onClick={() => onDisconnect(connection.id)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Disconnect
              </button>
            )}
            {connection.status === ConnectionStatus.Inactive && (
              <button
                onClick={() => onOpenPermissionsModal(connection.providerId)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Permissions list with Add permissions link */}
        {(connection.capabilityDisplayNames.length > 0 ||
          (connection.triggerDisplayNames && connection.triggerDisplayNames.length > 0) ||
          connection.status === ConnectionStatus.Active) && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              {connection.status === ConnectionStatus.Active && (
                <button
                  onClick={() =>
                    onOpenPermissionsModal(connection.providerId, connection)
                  }
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Add permissions
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {connection.capabilityDisplayNames.map((name) => (
                <span
                  key={`${connection.id}-cap-${name}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {name}
                </span>
              ))}
              {(connection.triggerDisplayNames || []).map((name) => (
                <span
                  key={`${connection.id}-trg-${name}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
