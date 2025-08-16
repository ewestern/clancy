import React, { useState, useEffect, useCallback } from "react";
import { Shield, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { ConnectionApi, CapabilitiesApi, Configuration as ConnectHubConfiguration, type Connection, ConnectionStatus } from "@ewestern/connect_hub_sdk";
import { useAuth } from "@clerk/react-router";

type ConnectionCard = Connection & {
  capabilityDisplayNames: string[];
  providerIcon?: string;
  providerDisplayName?: string;
};

const Connections: React.FC = () => {
  const { getToken } = useAuth();
  const [connectionCards, setConnectionCards] = useState<ConnectionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getConnectHubClient = useCallback(() => {
    return new ConnectHubConfiguration({
      basePath: import.meta.env.VITE_CONNECT_HUB_URL,
      accessToken: getToken() as Promise<string>,
    });
  }, [getToken]);

  const loadData = useCallback(async () => {
    try {
      const connectHubConfig = getConnectHubClient();
      const connectionApi = new ConnectionApi(connectHubConfig);
      const capabilitiesApi = new CapabilitiesApi(connectHubConfig);
      const [{ data }, providerCapabilities] = await Promise.all([
        connectionApi.connectionsGet(),
        capabilitiesApi.capabilitiesGet(),
      ]);

      // Build lookups:
      //  - capability names by provider
      //  - provider metadata (icon, display name)
      const capabilityNameByProvider: Record<string, Record<string, string>> = {};
      const providerMetaById: Record<string, { icon?: string; displayName?: string }> = {};
      for (const provider of providerCapabilities) {
        providerMetaById[provider.id] = {
          icon: provider.icon,
          displayName: provider.displayName,
        };
        capabilityNameByProvider[provider.id] = {};
        for (const cap of provider.capabilities) {
          capabilityNameByProvider[provider.id][cap.id] = cap.displayName;
        }
      }

      const withNames: ConnectionCard[] = data.map((conn) => {
        const nameMap = capabilityNameByProvider[conn.providerId] || {};
        const capabilityDisplayNames = (conn.capabilities || []).map(
          (capId) => nameMap[capId] || capId,
        );
        const meta = providerMetaById[conn.providerId] || {};
        return {
          ...conn,
          capabilityDisplayNames,
          providerIcon: meta.icon,
          providerDisplayName: meta.displayName || conn.displayName,
        };
      });

      // Sort by provider display name for readability
      const sorted = withNames.sort((a, b) => (a.displayName > b.displayName ? 1 : -1));
      setConnectionCards(sorted);
    } catch (error) {
      console.error("Failed to load connections data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getConnectHubClient]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      const connectionApi = new ConnectionApi(getConnectHubClient());
      await connectionApi.connectionsIdPatch({
        id: connectionId,
        connectionsIdPatchRequest: { status: ConnectionStatus.Inactive },
      });
      // Refresh list after disconnect
      await loadData();
    } catch (err) {
      console.error("Failed to disconnect:", err);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Connections</h1>
              <p className="mt-2 text-gray-600">
                Manage your OAuth connections for all AI employees to use
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Connection Cards */}
        <div className="space-y-6">
          {connectionCards.map((connectionCard) => (
            <div
              key={connectionCard.id}
              className="bg-white shadow rounded-lg overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {connectionCard.providerIcon ? (
                          <>
                            <img
                              src={connectionCard.providerIcon}
                              alt={connectionCard.providerDisplayName || connectionCard.displayName}
                              className="h-8 w-8"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                (e.currentTarget.nextSibling as HTMLElement | null)?.classList.remove("hidden");
                              }}
                            />
                            <span className="text-xl font-semibold text-gray-600 hidden">
                              {(connectionCard.providerDisplayName || connectionCard.displayName).charAt(0)}
                            </span>
                          </>
                        ) : (
                          <span className="text-xl font-semibold text-gray-600">
                            {(connectionCard.providerDisplayName || connectionCard.displayName).charAt(0)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {connectionCard.providerDisplayName || connectionCard.displayName}
                      </h3>
                      {/* Optionally show external account metadata summary */}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(connectionCard.status)}`}>
                      {getStatusIcon(connectionCard.status)}
                      <span className="ml-2">{getStatusText(connectionCard.status)}</span>
                    </div>
                    {connectionCard.status === ConnectionStatus.Active && (
                      <button
                        onClick={() => handleDisconnect(connectionCard.id)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>

                {/* Capabilities list */}
                {connectionCard.capabilityDisplayNames.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Capabilities</h4>
                    <div className="flex flex-wrap gap-2">
                      {connectionCard.capabilityDisplayNames.map((name) => (
                        <span
                          key={`${connectionCard.id}-${name}`}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {connectionCards.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No connections</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your AI employees don't require any external connections yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Connections;