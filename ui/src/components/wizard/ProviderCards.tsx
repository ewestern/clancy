import React from "react";
import { Check, ExternalLink, Zap } from "lucide-react";
import { clsx } from "clsx";
import type { ProviderCard } from "../../types";

interface ProviderCardsProps {
  availableProviders: ProviderCard[];
  connectedProviders: ProviderCard[];
  onConnectProvider: (providerId: string) => void;
  onDisconnectProvider: (providerId: string) => void;
}

export function ProviderCards({
  availableProviders,
  connectedProviders,
  onConnectProvider,
  onDisconnectProvider,
}: ProviderCardsProps) {
  // Group providers by category
  const groupedProviders = availableProviders.reduce((acc, provider) => {
    if (!acc[provider.category]) {
      acc[provider.category] = [];
    }
    acc[provider.category].push(provider);
    return acc;
  }, {} as Record<string, ProviderCard[]>);

  // Separate explicitly mentioned providers
  const explicitProviders = availableProviders.filter(p => p.isExplicitlyMentioned);

  const getProviderStatus = (provider: ProviderCard): ProviderCard => {
    const connected = connectedProviders.find(p => p.id === provider.id);
    return connected || provider;
  };

  const ProviderCardComponent = ({ provider }: { provider: ProviderCard }) => {
    const status = getProviderStatus(provider);
    
    return (
      <div
        className={clsx(
          "border rounded-lg p-4 transition-all duration-200",
          status.connectionStatus === 'connected'
            ? "border-green-200 bg-green-50 shadow-sm"
            : status.connectionStatus === 'connecting'
            ? "border-yellow-200 bg-yellow-50 shadow-sm"
            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              {/* Placeholder for provider logo */}
              <img
                src={provider.logo}
                alt={`${provider.name} logo`}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  // Fallback to text if image fails
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = provider.name.charAt(0).toUpperCase();
                    parent.className += ' text-gray-600 font-medium';
                  }
                }}
              />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{provider.name}</h4>
              <p className="text-sm text-gray-500 capitalize">{provider.category}</p>
            </div>
          </div>

          {/* Status indicator */}
          {status.connectionStatus === 'connected' && (
            <div className="flex items-center space-x-1 text-green-600">
              <Check size={16} />
              <span className="text-sm font-medium">Connected</span>
            </div>
          )}
          
          {provider.isExplicitlyMentioned && (
            <div className="flex items-center space-x-1 text-purple-600">
              <Zap size={16} />
              <span className="text-xs font-medium">Mentioned</span>
            </div>
          )}
        </div>

        {/* Account info for connected providers */}
        {status.connectionStatus === 'connected' && status.accountInfo && (
          <div className="mb-3 p-2 bg-white rounded border">
            <p className="text-sm text-gray-600">
              Connected as:{" "}
              <span className="font-medium">
                {status.accountInfo.email || status.accountInfo.accountName}
              </span>
            </p>
          </div>
        )}

        {/* Capabilities */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Capabilities:</p>
          <div className="flex flex-wrap gap-1">
            {provider.capabilities.slice(0, 3).map((capability, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
              >
                {capability}
              </span>
            ))}
            {provider.capabilities.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                +{provider.capabilities.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="flex justify-between items-center">
          {status.connectionStatus === 'connected' ? (
            <button
              onClick={() => onDisconnectProvider(provider.id)}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => onConnectProvider(provider.id)}
              disabled={status.connectionStatus === 'connecting'}
              className={clsx(
                "inline-flex items-center px-3 py-2 rounded-button text-sm font-medium transition-colors",
                status.connectionStatus === 'connecting'
                  ? "bg-yellow-100 text-yellow-800 cursor-not-allowed"
                  : "bg-primary-600 text-white hover:bg-primary-700"
              )}
            >
              {status.connectionStatus === 'connecting' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink size={14} className="mr-1" />
                  Connect
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Explicitly mentioned providers */}
      {explicitProviders.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Zap size={16} className="text-purple-600" />
            <h3 className="font-medium text-gray-900">Mentioned in Job Description</h3>
          </div>
          <div className="grid gap-3">
            {explicitProviders.map((provider) => (
              <ProviderCardComponent key={provider.id} provider={provider} />
            ))}
          </div>
        </div>
      )}

      {/* Grouped providers by category */}
      {Object.entries(groupedProviders).map(([category, providers]) => {
        // Filter out explicitly mentioned providers from category groups
        const categoryProviders = providers.filter(p => !p.isExplicitlyMentioned);
        
        if (categoryProviders.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="font-medium text-gray-900 mb-3 capitalize">
              {category} Providers
              {categoryProviders.length > 1 && (
                <span className="text-gray-500 text-sm font-normal ml-1">
                  (Choose one or more)
                </span>
              )}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categoryProviders.map((provider) => (
                <ProviderCardComponent key={provider.id} provider={provider} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Connection summary */}
      {connectedProviders.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Check size={16} className="text-green-600" />
            <h4 className="font-medium text-green-900">
              {connectedProviders.length} Provider{connectedProviders.length !== 1 ? 's' : ''} Connected
            </h4>
          </div>
          <p className="text-sm text-green-700">
            Your AI employee can now access and work with your connected services.
          </p>
        </div>
      )}
    </div>
  );
} 