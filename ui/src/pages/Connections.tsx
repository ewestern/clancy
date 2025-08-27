import React, { useState, useEffect, useCallback } from "react";
import { Shield, RefreshCw, Search, X } from "lucide-react";
import {
  ConnectionCard,
  type ConnectionCard as ConnectionCardType,
} from "../components/ConnectionCard";
import {
  ConnectionApi,
  CapabilitiesApi,
  TriggersApi,
  OAuthApi,
  Configuration as ConnectHubConfiguration,
  ConnectionStatus,
  type ProviderCapabilities,
  type Trigger,
  type OauthAuditPostRequest,
  ProviderKind,
  ProviderAuth,
} from "@ewestern/connect_hub_sdk";
import { useAuth } from "@clerk/react-router";

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
  const [selectedCapabilities, setSelectedCapabilities] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTriggers, setSelectedTriggers] = useState<Set<string>>(
    new Set(),
  );
  const [existingCapabilities, setExistingCapabilities] = useState<Set<string>>(
    new Set(),
  );
  const [existingConnection, setExistingConnection] =
    useState<ConnectionCardType | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  console.log("Selected provider", selectedProvider?.capabilities);

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

      // Build lookups:
      //  - capability names by provider
      //  - provider metadata (icon, display name)
      const capabilityNameByProvider: Record<
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
        capabilityNameByProvider[provider.id] = {};
        for (const cap of provider.capabilities) {
          capabilityNameByProvider[provider.id][cap.id] = cap.displayName;
        }
      }

      const withNames: ConnectionCardType[] = data.map((conn) => {
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
      setSearchTerm("");

      if (connection) {
        // For existing connections, pre-select existing capabilities
        const existing = new Set(connection.capabilities || []);
        setExistingCapabilities(existing);
        setSelectedCapabilities(existing);
        setSelectedTriggers(new Set()); // TODO: Get existing triggers from connection
        setExistingConnection(connection);
      } else {
        // For new connections, start fresh
        setExistingCapabilities(new Set());
        setSelectedCapabilities(new Set());
        setSelectedTriggers(new Set());
        setExistingConnection(null);
      }

      setIsPermissionsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsPermissionsModalOpen(false);
    setSelectedProvider(null);
    setSelectedCapabilities(new Set());
    setSelectedTriggers(new Set());
    setExistingCapabilities(new Set());
    setExistingConnection(null);
    setSearchTerm("");
    setIsConnecting(false);
  };

  const handleCapabilityToggle = (capabilityId: string) => {
    // Don't allow toggling existing capabilities
    if (existingCapabilities.has(capabilityId)) {
      return;
    }

    const newSelected = new Set(selectedCapabilities);
    if (newSelected.has(capabilityId)) {
      newSelected.delete(capabilityId);
    } else {
      newSelected.add(capabilityId);
    }
    setSelectedCapabilities(newSelected);
  };

  const handleTriggerToggle = (triggerId: string) => {
    const newSelected = new Set(selectedTriggers);
    if (newSelected.has(triggerId)) {
      newSelected.delete(triggerId);
    } else {
      newSelected.add(triggerId);
    }
    setSelectedTriggers(newSelected);
  };

  const handleSelectAll = () => {
    if (!selectedProvider) return;
    const allCapIds = selectedProvider.capabilities.map((cap) => cap.id);
    const allTriggerIds = allTriggers
      .filter((trigger) => trigger.providerId === selectedProvider.id)
      .map((trigger) => trigger.id);
    setSelectedCapabilities(new Set(allCapIds));
    setSelectedTriggers(new Set(allTriggerIds));
  };

  const handleConnect = async () => {
    if (!selectedProvider) return;

    // For existing connections, only audit new capabilities
    // For new connections, audit all selected capabilities
    const capabilitiesToAudit = existingConnection
      ? Array.from(selectedCapabilities).filter(
          (capId) => !existingCapabilities.has(capId),
        )
      : Array.from(selectedCapabilities);

    const triggersToAudit = Array.from(selectedTriggers);

    if (capabilitiesToAudit.length === 0 && triggersToAudit.length === 0) return;

    setIsConnecting(true);
    try {
      const connectHubConfig = getConnectHubClient();
      const oauthApi = new OAuthApi(connectHubConfig);

      const auditBody: OauthAuditPostRequest = {
        capabilities: capabilitiesToAudit.map((capabilityId) => ({
          providerId: selectedProvider.id,
          capabilityId,
        })),
        triggers: triggersToAudit.map((triggerId) => ({
          providerId: selectedProvider.id,
          triggerId,
        })),
      };

      const results = await oauthApi.oauthAuditPost({
        oauthAuditPostRequest: auditBody,
      });
      const providerResult = results.find(
        (r) => r.providerId === selectedProvider.id,
      );

      if (providerResult?.oauthUrl) {
        // Get the Clerk token and append it to the OAuth URL
        const token = await getToken();
        if (!token) {
          console.error("No authentication token available");
          // TODO: Show error message to user
          return;
        }

        const url = new URL(providerResult.oauthUrl);
        url.searchParams.set("token", token);

        // Open the authenticated OAuth URL in popup
        window.open(
          url.toString(),
          "oauth_connect",
          "width=500,height=700,noopener,noreferrer",
        );
        handleCloseModal();
      } else {
        console.error("No OAuth URL returned for provider");
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error("Failed to start OAuth flow:", error);
      // TODO: Show error message to user
    } finally {
      setIsConnecting(false);
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
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={handleCloseModal}
                aria-hidden="true"
              ></div>

              {/* Center modal */}
              <span
                className="hidden sm:inline-block sm:align-middle sm:h-screen"
                aria-hidden="true"
              >
                &#8203;
              </span>

              {/* Modal panel */}
              <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {selectedProvider.icon ? (
                          <img
                            src={selectedProvider.icon}
                            alt={selectedProvider.displayName}
                            className="h-8 w-8"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-gray-600">
                            {selectedProvider.displayName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {existingConnection
                            ? `Add permissions to ${selectedProvider.displayName}`
                            : `Connect to ${selectedProvider.displayName}`}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {existingConnection
                            ? "Select additional permissions to add"
                            : "Select the permissions you need"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCloseModal}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Search */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search permissions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center mb-4">
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Select all ({selectedProvider.capabilities.length + allTriggers.filter(t => t.providerId === selectedProvider.id).length})
                    </button>
                    <span className="text-sm text-gray-500">
                      {selectedCapabilities.size + selectedTriggers.size} selected
                    </span>
                  </div>

                  {/* Permissions List */}
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                    {(() => {
                      const filteredCapabilities =
                        selectedProvider.capabilities.filter(
                          (cap) =>
                            cap.displayName
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                            cap.description
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()),
                        );

                      const filteredTriggers = allTriggers
                        .filter((trigger) => trigger.providerId === selectedProvider.id)
                        .filter(
                          (trigger) =>
                            trigger.description
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                            trigger.id
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()),
                        );

                      const totalFiltered = filteredCapabilities.length + filteredTriggers.length;

                      if (totalFiltered === 0) {
                        return (
                          <div className="p-4 text-center text-gray-500">
                            {searchTerm
                              ? "No permissions match your search"
                              : "No permissions available"}
                          </div>
                        );
                      }

                      return (
                        <>
                          {/* Capabilities Section */}
                          {filteredCapabilities.length > 0 && (
                            <>
                              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                  Capabilities
                                </h4>
                              </div>
                              {filteredCapabilities.map((capability) => {
                                const isExisting = existingCapabilities.has(
                                  capability.id,
                                );
                                const isSelected = selectedCapabilities.has(
                                  capability.id,
                                );

                                return (
                                  <label
                                    key={capability.id}
                                    className={`flex items-start space-x-3 p-3 border-b border-gray-100 last:border-b-0 ${
                                      isExisting
                                        ? "bg-gray-50 cursor-default"
                                        : "hover:bg-gray-50 cursor-pointer"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() =>
                                        handleCapabilityToggle(capability.id)
                                      }
                                      disabled={isExisting}
                                      className={`mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                                        isExisting
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2">
                                        <p
                                          className={`text-sm font-medium ${isExisting ? "text-gray-600" : "text-gray-900"}`}
                                        >
                                          {capability.displayName}
                                        </p>
                                        {isExisting && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            Connected
                                          </span>
                                        )}
                                      </div>
                                      <p
                                        className={`text-xs mt-1 ${isExisting ? "text-gray-400" : "text-gray-500"}`}
                                      >
                                        {capability.description}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </>
                          )}

                          {/* Triggers Section */}
                          {filteredTriggers.length > 0 && (
                            <>
                              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                  Triggers
                                </h4>
                              </div>
                              {filteredTriggers.map((trigger) => {
                                const isSelected = selectedTriggers.has(trigger.id);

                                return (
                                  <label
                                    key={trigger.id}
                                    className="flex items-start space-x-3 p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleTriggerToggle(trigger.id)}
                                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2">
                                        <p className="text-sm font-medium text-gray-900">
                                          {trigger.id}
                                        </p>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                          Trigger
                                        </span>
                                      </div>
                                      <p className="text-xs mt-1 text-gray-500">
                                        {trigger.description}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={handleConnect}
                    disabled={
                      isConnecting ||
                      (existingConnection
                        ? Array.from(selectedCapabilities).filter(
                            (capId) => !existingCapabilities.has(capId),
                          ).length === 0 && selectedTriggers.size === 0
                        : selectedCapabilities.size === 0 && selectedTriggers.size === 0)
                    }
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConnecting
                      ? existingConnection
                        ? "Adding..."
                        : "Connecting..."
                      : existingConnection
                        ? "Add Permissions"
                        : "Connect"}
                  </button>
                  <button
                    onClick={handleCloseModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Connections;
