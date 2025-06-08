/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect } from "react";
import type { HiringWizardData } from "../../types";

interface StepProps {
  data: HiringWizardData;
  onChange: (stepData: Partial<HiringWizardData>) => void;
  onValidityChange: (isValid: boolean) => void;
}

export function PermissionsStep({
  data,
  onChange,
  onValidityChange,
}: StepProps) {
  useEffect(() => {
    onValidityChange(true); // Always valid for now
  }, [onValidityChange]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Permissions & Integrations
        </h3>
        <p className="text-gray-600">
          Configure what your AI employee can access and connect.
        </p>
      </div>

      <div className="bg-gray-50 rounded-card p-8 text-center">
        <p className="text-gray-600">
          🔧 Permissions configuration coming soon...
        </p>
      </div>
    </div>
  );
}
