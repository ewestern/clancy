import { Cog, Users, Zap, Clock } from "lucide-react";
import type { CollaborativeWizardData } from "../../types";

interface PhaseProgressIndicatorProps {
  phase: CollaborativeWizardData["phase"];
}

export function PhaseProgressIndicator({ phase }: PhaseProgressIndicatorProps) {
  const getPhaseInfo = () => {
    switch (phase) {
      case "workflows":
        return {
          icon: <Cog className="animate-spin" size={20} />,
          title: "Analyzing workflows...",
          description:
            "Breaking down your job description into automated processes",
          tips: [
            "This typically takes 30-60 seconds",
            "We're identifying key tasks and dependencies",
          ],
        };
      case "connect":
        return {
          icon: <Users className="animate-pulse" size={20} />,
          title: "Analyzing tasks...",
          description: "Finding the right AI Employees for each workflow",
          tips: [
            "Matching workflows to available tasks",
            "Identifying integration requirements",
          ],
        };
      case "ready":
        return {
          icon: <Zap className="animate-bounce" size={20} />,
          title: "Almost ready!",
          description: "Setting up required integrations",
          tips: [
            "Connect the services your AI employee needs",
            "All workflows have been mapped successfully",
          ],
        };
      default:
        return {
          icon: <Clock className="animate-pulse" size={20} />,
          title: "Processing...",
          description: "Working on your request",
          tips: [],
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
        <div className="text-primary-600">{phaseInfo.icon}</div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {phaseInfo.title}
      </h3>

      <p className="text-gray-600 mb-4 max-w-md">{phaseInfo.description}</p>

      {phaseInfo.tips.length > 0 && (
        <div className="text-sm text-gray-500 space-y-1">
          {phaseInfo.tips.map((tip, index) => (
            <p key={index}>• {tip}</p>
          ))}
        </div>
      )}
    </div>
  );
}
