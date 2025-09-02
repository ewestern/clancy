import React, { useState, useEffect, useCallback } from "react";
import { Shield, RefreshCw } from "lucide-react";
import {
  ConnectionCard,
  type ConnectionCard as ConnectionCardType,
} from "../components/ConnectionCard";
import {
  ConnectionApi,
  CapabilitiesApi,
  TriggersApi,
  Configuration as ConnectHubConfiguration,
  ConnectionStatus,
  type ProviderCapabilities,
  type Trigger,
  ProviderKind,
  ProviderAuth,
} from "@ewestern/connect_hub_sdk";
import { useAuth } from "@clerk/react-router";
import PermissionsModal from "../components/PermissionsModal";

const Connections: React.FC = () => {
  const { getToken } = useAuth();
  const [connectionCards, setConnectionCards] = useState<ConnectionCardType[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allProviders, setAllProviders] = useState<ProviderCapabilities[]>([]);
  const [allTriggers, setAllTriggers] = useState<Trigger[]>([]);
  const [unconnectedProviders, setUnconnectedProviders] = useState<
    ProviderCapabilities[]
  >([]);

  // Modal state
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderCapabilities | null>(null);
  const [existingConnection, setExistingConnection] =
    useState<ConnectionCardType | null>(null);

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
      const triggersApi = new TriggersApi(connectHubConfig);
      const [{ data }, providerCapabilities, triggers] = await Promise.all([
        connectionApi.connectionsGet(),
        capabilitiesApi.capabilitiesGet(),
        triggersApi.triggersGet(),
      ]);

      const itemNameByProvider: Record<
        string,
        Record<string, string>
      > = {};
      const providerMetaById: Record<
        string,
        { icon?: string; displayName?: string }
      > = {};
      for (const provider of providerCapabilities) {
        providerMetaById[provider.id] = {
          icon: provider.icon,
          displayName: provider.displayName,
        };
        itemNameByProvider[provider.id] = {};
        for (const cap of provider.capabilities) {
          itemNameByProvider[provider.id][cap.id] = cap.displayName;
        }
        for (const trg of triggers) {
          itemNameByProvider[provider.id][trg.id] = trg.description;
        }
      }

      const withNames: ConnectionCardType[] = data.map((conn) => {
        const nameMap = itemNameByProvider[conn.providerId] || {};
        const permissionDisplayNames = (conn.permissions || [])
          .filter((perm) => perm.startsWith(`${conn.providerId}/`))
          .map((perm) => perm.split("/")[1])
          .filter((iteId): iteId is string => Boolean(iteId))
          .map((iteId) => nameMap[iteId] || iteId);
        const meta = providerMetaById[conn.providerId] || {};
        return {
          ...conn,
          permissionDisplayNames,
          providerIcon: meta.icon,
          providerDisplayName: meta.displayName || conn.displayName,
        };
      });

      // Sort by provider display name for readability
      const sorted = withNames.sort((a, b) =>
        a.displayName > b.displayName ? 1 : -1,
      );
      setConnectionCards(sorted);
      setAllProviders(providerCapabilities);
      setAllTriggers(triggers);

      // Compute unconnected providers
      const connectedProviderIds = new Set(
        sorted.map((conn) => conn.providerId),
      );
      const unconnected = providerCapabilities.filter(
        (provider) =>
          !connectedProviderIds.has(provider.id) &&
          provider.kind === ProviderKind.External &&
          provider.auth === ProviderAuth.Oauth2,
      );
      setUnconnectedProviders(unconnected);
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
      const response = await connectionApi.connectionsIdPatch({
        id: connectionId,
        connectionsIdPatchRequest: { status: ConnectionStatus.Inactive },
      });
      console.log("Disconnected", response);
      // Refresh list after disconnect
      await loadData();
    } catch (err) {
      console.error("Failed to disconnect:", err);
    }
  };

  const handleOpenPermissionsModal = (
    providerId: string,
    connection?: ConnectionCardType,
  ) => {
    const provider = allProviders.find((p) => p.id === providerId);
    if (provider) {
      setSelectedProvider(provider);
      setExistingConnection(connection || null);
      setIsPermissionsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsPermissionsModalOpen(false);
    setSelectedProvider(null);
    setExistingConnection(null);
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
              <h1 className="text-3xl font-bold text-gray-900">
                My Connections
              </h1>
              <p className="mt-2 text-gray-600">
                Manage your OAuth connections for all AI employees to use
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Connection Cards */}
        <div className="space-y-6">
          {connectionCards.map((connectionCard) => (
            <ConnectionCard
              key={connectionCard.id}
              connection={connectionCard}
              onDisconnect={handleDisconnect}
              onOpenPermissionsModal={handleOpenPermissionsModal}
            />
          ))}
        </div>

        {/* Unconnected Integrations */}
        {unconnectedProviders.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Unconnected Integrations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {unconnectedProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                        {provider.icon ? (
                          <img
                            src={provider.icon}
                            alt={provider.displayName}
                            className="h-6 w-6"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              (
                                e.currentTarget
                                  .nextSibling as HTMLElement | null
                              )?.classList.remove("hidden");
                            }}
                          />
                        ) : null}
                        <span
                          className={`text-sm font-semibold text-gray-600 ${provider.icon ? "hidden" : ""}`}
                        >
                          {provider.displayName.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {provider.displayName}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                    {provider.description}
                  </p>
                  <button
                    onClick={() => handleOpenPermissionsModal(provider.id)}
                    className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Connect
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {connectionCards.length === 0 && unconnectedProviders.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No connections
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Your AI employees don't require any external connections yet.
            </p>
          </div>
        )}

        {/* Permissions Selection Modal */}
        {isPermissionsModalOpen && selectedProvider && (
          <PermissionsModal
            open={isPermissionsModalOpen}
            provider={selectedProvider}
            allTriggers={allTriggers}
            existingConnection={existingConnection}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
};

export default Connections;
