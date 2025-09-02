import React, { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useAuth } from "@clerk/react-router";
import {
  type ProviderCapabilities,
  type Trigger,
} from "@ewestern/connect_hub_sdk";
import { type ConnectionCard as ConnectionCardType } from "./ConnectionCard";

interface PermissionsModalProps {
  open: boolean;
  provider: ProviderCapabilities;
  allTriggers: Trigger[];
  existingConnection: ConnectionCardType | null;
  onClose: () => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  open,
  provider,
  allTriggers,
  existingConnection,
  onClose,
}) => {
  const { getToken } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCapabilities, setSelectedCapabilities] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTriggers, setSelectedTriggers] = useState<Set<string>>(
    new Set(),
  );
  const [existingCapabilities, setExistingCapabilities] = useState<Set<string>>(
    new Set(),
  );
  const [isConnecting, setIsConnecting] = useState(false);

  // Pre-compute provider capability ids for quick filtering
  const providerCapabilityIds = useMemo(
    () => new Set((provider.capabilities || []).map((c) => c.id)),
    [provider],
  );

  useEffect(() => {
    if (!open) return;
    setSearchTerm("");
    if (existingConnection) {
      const existingCapIds = (existingConnection.permissions || [])
        .filter((perm) => perm.startsWith(`${provider.id}/`))
        .map((perm) => perm.split("/")[1])
        .filter((id) => providerCapabilityIds.has(id));
      const existing = new Set<string>(existingCapIds);
      setExistingCapabilities(existing);
      setSelectedCapabilities(new Set(existingCapIds));
      setSelectedTriggers(new Set());
    } else {
      setExistingCapabilities(new Set());
      setSelectedCapabilities(new Set());
      setSelectedTriggers(new Set());
    }
  }, [open, provider.id, providerCapabilityIds, existingConnection]);

  const handleCapabilityToggle = (capabilityId: string) => {
    if (existingCapabilities.has(capabilityId)) return;
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
    const allCapIds = provider.capabilities.map((cap) => cap.id);
    const allTriggerIds = allTriggers
      .filter((trigger) => trigger.providerId === provider.id)
      .map((trigger) => trigger.id);
    setSelectedCapabilities(new Set(allCapIds));
    setSelectedTriggers(new Set(allTriggerIds));
  };

  const handleConnect = async () => {
    // For existing connections: if no new capability and no triggers, no-op
    if (
      existingConnection &&
      Array.from(selectedCapabilities).filter(
        (capId) => !existingCapabilities.has(capId),
      ).length === 0 &&
      selectedTriggers.size === 0
    ) {
      return;
    }

    setIsConnecting(true);
    try {
      const capabilitiesToRequest = Array.from(selectedCapabilities);
      const triggersToRequest = Array.from(selectedTriggers);

      const permissions = [
        ...capabilitiesToRequest.map((capId) => `${provider.id}/${capId}`),
        ...triggersToRequest.map((trgId) => `${provider.id}/${trgId}`),
      ];

      const token2 = await getToken();
      if (!token2) {
        console.error("No authentication token available");
        return;
      }

      const baseUrl = (import.meta.env.VITE_CONNECT_HUB_URL || "").replace(
        /\/$/,
        "",
      );
      const url = new URL(`${baseUrl}/oauth/launch/${provider.id}`);
      for (const perm of permissions) {
        url.searchParams.append("permissions", perm);
      }
      url.searchParams.set("token", token2);

      window.open(
        url.toString(),
        "oauth_connect",
        "width=500,height=700,noopener,noreferrer",
      );
      onClose();
    } catch (error) {
      console.error("Failed to start OAuth flow:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  if (!open) return null;

  const filteredCapabilities = provider.capabilities.filter(
    (cap) =>
      cap.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cap.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredTriggers = allTriggers
    .filter((trigger) => trigger.providerId === provider.id)
    .filter(
      (trigger) =>
        trigger.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trigger.id.toLowerCase().includes(searchTerm.toLowerCase()),
    );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
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
                  {provider.icon ? (
                    <img
                      src={provider.icon}
                      alt={provider.displayName}
                      className="h-8 w-8"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-gray-600">
                      {provider.displayName.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {existingConnection
                      ? `Add permissions to ${provider.displayName}`
                      : `Connect to ${provider.displayName}`}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {existingConnection
                      ? "Select additional permissions to add"
                      : "Select the permissions you need"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
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
                {`Select all (${provider.capabilities.length + filteredTriggers.filter((t) => t.providerId === provider.id).length})`}
              </button>
              <span className="text-sm text-gray-500">
                {selectedCapabilities.size + selectedTriggers.size} selected
              </span>
            </div>

            {/* Permissions List */}
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
              {(() => {
                const totalFiltered =
                  filteredCapabilities.length + filteredTriggers.length;
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
                  : selectedCapabilities.size === 0 &&
                    selectedTriggers.size === 0)
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
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionsModal;
