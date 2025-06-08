import React, { useState, useEffect } from "react";
import { X, Sparkles, CheckCircle } from "lucide-react";
import { clsx } from "clsx";
import { ChatInterface } from "./wizard/ChatInterface";
import { ProviderCards } from "./wizard/ProviderCards";
import { EnhancedWorkflowDisplay } from "./wizard/EnhancedWorkflowDisplay";
import type { CollaborativeWizardData, ChatMessage, ProviderCard, EnhancedWorkflow, WizardWebSocketMessage } from "../types";
import { useWebSocketCtx } from "../context/WebSocketContext";

interface HiringWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: CollaborativeWizardData) => void;
}

export function HiringWizard({
  isOpen,
  onClose,
  onComplete,
}: HiringWizardProps) {
  const [wizardData, setWizardData] = useState<CollaborativeWizardData>({
    jobDescription: "",
    chatHistory: [],
    enhancedWorkflows: [],
    availableProviders: [],
    connectedProviders: [],
    phase: 'job_description',
    canComplete: false,
    notifications: {
      slack: { taskComplete: true, needsReview: true, error: true },
      email: { taskComplete: false, needsReview: true, error: true },
      sms: { taskComplete: false, needsReview: false, error: true },
    },
    requireApproval: true,
    slaHours: 24,
    pinToDashboard: true,
  });

  const { send } = useWebSocketCtx();
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Reset wizard when modal opens
    if (isOpen) {
      setWizardData(prev => ({
        ...prev,
        jobDescription: "",
        chatHistory: [],
        enhancedWorkflows: [],
        availableProviders: [],
        connectedProviders: [],
        phase: 'job_description',
        canComplete: false,
      }));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleJobDescriptionSubmit = async () => {
    if (!wizardData.jobDescription.trim()) return;

    setIsAnalyzing(true);
    setIsAgentTyping(true);

    // Send job description to agent for analysis
    const message: WizardWebSocketMessage = {
      type: 'job_analysis',
      payload: {
        chatMessage: {
          id: Date.now().toString(),
          sender: 'user',
          content: `Here's the job description: ${wizardData.jobDescription}`,
          timestamp: new Date(),
        }
      }
    };

    send(message);

    // Simulate agent response for demo
    setTimeout(() => {
      const agentResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        content: "Thanks! I've analyzed your job description and created some workflows. I've also identified the providers you'll need to connect. Let me know if you'd like to modify anything!",
        timestamp: new Date(),
      };

      // Mock workflows
      const mockWorkflows: EnhancedWorkflow[] = [
        {
          id: 'workflow-1',
          title: 'Email Response Automation',
          frequency: 'Real-time',
          runtime: '2-3 minutes',
          subSteps: [
            'Monitor designated email inbox',
            'Analyze incoming email content and intent',
            'Generate appropriate response based on context',
            'Send for approval if required, or send automatically'
          ],
          connectionStatus: 'requires_connection',
          requiredProviders: ['Gmail', 'Outlook'],
          lastUpdated: new Date(),
          changeHighlight: true,
        },
        {
          id: 'workflow-2', 
          title: 'Invoice Processing',
          frequency: 'Daily',
          runtime: '5-10 minutes',
          subSteps: [
            'Collect billing data from project management system',
            'Generate professional invoice using template',
            'Send invoice to client via email',
            'Track payment status and send reminders'
          ],
          connectionStatus: 'requires_connection',
          requiredProviders: ['QuickBooks', 'Gmail'],
          lastUpdated: new Date(),
          changeHighlight: true,
        }
      ];

      // Mock providers
      const mockProviders: ProviderCard[] = [
        {
          id: 'gmail',
          name: 'Gmail',
          logo: '/logos/gmail.png',
          category: 'email',
          connectionStatus: 'disconnected',
          requiredScopes: ['read', 'send'],
          isExplicitlyMentioned: false,
          capabilities: ['Email', 'Calendar', 'Contacts']
        },
        {
          id: 'outlook',
          name: 'Outlook',
          logo: '/logos/outlook.png', 
          category: 'email',
          connectionStatus: 'disconnected',
          requiredScopes: ['read', 'send'],
          isExplicitlyMentioned: false,
          capabilities: ['Email', 'Calendar', 'Tasks']
        },
        {
          id: 'quickbooks',
          name: 'QuickBooks',
          logo: '/logos/quickbooks.png',
          category: 'accounting',
          connectionStatus: 'disconnected',
          requiredScopes: ['read', 'write'],
          isExplicitlyMentioned: false,
          capabilities: ['Invoicing', 'Payments', 'Reports']
        }
      ];

      setWizardData(prev => ({
        ...prev,
        chatHistory: [...prev.chatHistory, message.payload.chatMessage!, agentResponse],
        enhancedWorkflows: mockWorkflows,
        availableProviders: mockProviders,
        phase: 'collaboration'
      }));

      setIsAgentTyping(false);
      setIsAnalyzing(false);
    }, 2000);

    setWizardData(prev => ({
      ...prev,
      phase: 'collaboration'
    }));
  };

  const handleSendMessage = (messageContent: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    setWizardData(prev => ({
      ...prev,
      chatHistory: [...prev.chatHistory, userMessage]
    }));

    setIsAgentTyping(true);

    // Send to agent
    const message: WizardWebSocketMessage = {
      type: 'chat_message',
      payload: { chatMessage: userMessage }
    };
    send(message);

    // Simulate agent response
    setTimeout(() => {
      const agentResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        content: "I understand your feedback. Let me update the workflows accordingly.",
        timestamp: new Date(),
      };

      setWizardData(prev => ({
        ...prev,
        chatHistory: [...prev.chatHistory, agentResponse]
      }));

      setIsAgentTyping(false);
    }, 1500);
  };

  const handleConnectProvider = (providerId: string) => {
    // Update provider status to connecting
    setWizardData(prev => ({
      ...prev,
      availableProviders: prev.availableProviders.map(p => 
        p.id === providerId 
          ? { ...p, connectionStatus: 'connecting' as const }
          : p
      )
    }));

    // Simulate OAuth flow
    setTimeout(() => {
      const provider = wizardData.availableProviders.find(p => p.id === providerId);
      if (provider) {
        const connectedProvider: ProviderCard = {
          ...provider,
          connectionStatus: 'connected',
          accountInfo: {
            email: 'user@example.com',
            accountName: 'John Doe'
          }
        };

        setWizardData(prev => ({
          ...prev,
          connectedProviders: [...prev.connectedProviders, connectedProvider],
          availableProviders: prev.availableProviders.map(p => 
            p.id === providerId ? connectedProvider : p
          ),
          // Update workflow connection status
          enhancedWorkflows: prev.enhancedWorkflows.map(w => {
            if (w.requiredProviders.includes(provider.name)) {
              const allConnected = w.requiredProviders.every(reqProvider => 
                [...prev.connectedProviders, connectedProvider].some(cp => cp.name === reqProvider)
              );
              return {
                ...w,
                connectionStatus: allConnected ? 'fully_connected' as const : 'partially_connected' as const,
                changeHighlight: true,
                lastUpdated: new Date()
              };
            }
            return w;
          }),
          canComplete: true // Enable completion once any provider is connected
        }));

        // Send connection update
        const message: WizardWebSocketMessage = {
          type: 'provider_connected',
          payload: { connectedProvider }
        };
        send(message);
      }
    }, 2000);
  };

  const handleDisconnectProvider = (providerId: string) => {
    setWizardData(prev => ({
      ...prev,
      connectedProviders: prev.connectedProviders.filter(p => p.id !== providerId),
      availableProviders: prev.availableProviders.map(p => 
        p.id === providerId 
          ? { ...p, connectionStatus: 'disconnected' as const, accountInfo: undefined }
          : p
      ),
      canComplete: prev.connectedProviders.length > 1 // Keep enabled if other providers connected
    }));
  };

  const handleComplete = () => {
    onComplete(wizardData);
    onClose();
  };

  // Job Description Phase
  if (wizardData.phase === 'job_description') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-card w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Hire an AI Employee
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Describe what you'd like your AI employee to do
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-button transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Job Description Input */}
          <div className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                What should your AI employee do?
              </h3>
              <p className="text-gray-600">
                Describe the role and responsibilities. The more detailed, the better we can automate it.
              </p>
            </div>

            <div className="space-y-4">
              <textarea
                value={wizardData.jobDescription}
                onChange={(e) => setWizardData(prev => ({ ...prev, jobDescription: e.target.value }))}
                placeholder="Describe the job and responsibilities...

For example:
We need an AI assistant to handle our monthly invoicing process. This includes gathering billing data from our project management system, creating professional invoices, and sending them to clients for payment. The assistant should also track payment status and send follow-up reminders when necessary."
                className="w-full h-64 p-4 border border-gray-300 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent resize-none"
              />
              
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Minimum 20 characters required. Current: {wizardData.jobDescription.length}
                </p>
                
                <button
                  onClick={handleJobDescriptionSubmit}
                  disabled={wizardData.jobDescription.trim().length < 20 || isAnalyzing}
                  className={clsx(
                    "inline-flex items-center px-6 py-3 rounded-button font-medium transition-colors",
                    wizardData.jobDescription.trim().length >= 20 && !isAnalyzing
                      ? "bg-primary-600 text-white hover:bg-primary-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="mr-2" />
                      Generate Workflows
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Collaboration Phase
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-card w-full max-w-7xl max-h-[95vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Configure Your AI Employee
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Review workflows, connect providers, and provide feedback
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-button transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Main Content - Split Layout */}
        <div className="flex h-[calc(95vh-200px)]">
          {/* Left Panel - Workflows and Chat */}
          <div className="flex-1 flex flex-col border-r border-gray-200">
            {/* Workflows */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Proposed Workflows
                </h3>
                <p className="text-sm text-gray-600">
                  These are the automated processes your AI employee will handle
                </p>
              </div>
              
              <EnhancedWorkflowDisplay 
                workflows={wizardData.enhancedWorkflows}
              />
            </div>

            {/* Chat Interface */}
            <div className="h-80 border-t border-gray-200">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h4 className="font-medium text-gray-900">Chat with AI Assistant</h4>
                <p className="text-sm text-gray-600">Ask questions or provide feedback about the workflows</p>
              </div>
              <div className="h-60">
                <ChatInterface
                  messages={wizardData.chatHistory}
                  onSendMessage={handleSendMessage}
                  isAgentTyping={isAgentTyping}
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Provider Cards */}
          <div className="w-96 p-6 overflow-y-auto bg-gray-50">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Required Integrations
              </h3>
              <p className="text-sm text-gray-600">
                Connect the services your AI employee needs to access
              </p>
            </div>

            <ProviderCards
              availableProviders={wizardData.availableProviders}
              connectedProviders={wizardData.connectedProviders}
              onConnectProvider={handleConnectProvider}
              onDisconnectProvider={handleDisconnectProvider}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {wizardData.connectedProviders.length > 0 ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle size={16} />
                <span>{wizardData.connectedProviders.length} provider(s) connected</span>
              </div>
            ) : (
              <span>Connect at least one provider to continue</span>
            )}
          </div>

          <button
            onClick={handleComplete}
            disabled={!wizardData.canComplete}
            className={clsx(
              "inline-flex items-center px-6 py-2 text-sm font-medium rounded-button transition-colors",
              wizardData.canComplete
                ? "bg-success-500 text-white hover:bg-success-600"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            🎉 Hire AI Employee
          </button>
        </div>
      </div>
    </div>
  );
}
