import { useEffect } from "react";
import type { HiringWizardData } from "../../types";

interface StepProps {
  data: HiringWizardData;
  onChange: (stepData: Partial<HiringWizardData>) => void;
  onValidityChange: (isValid: boolean) => void;
}

export function CommunicationStep({
  data,
  onChange,
  onValidityChange,
}: StepProps) {
  useEffect(() => {
    onValidityChange(true);
  }, [onValidityChange]);

  // Suppress unused params
  void data;
  void onChange;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Communication & Oversight
        </h3>
        <p className="text-gray-600">
          Set up notifications and approval workflows.
        </p>
      </div>

      <div className="bg-gray-50 rounded-card p-8 text-center">
        <p className="text-gray-600">
          📞 Communication settings coming soon...
        </p>
      </div>
    </div>
  );
}
