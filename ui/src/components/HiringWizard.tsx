import React, { useState, useEffect } from "react";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import { JobDescriptionStep } from "./wizard/JobDescriptionStep";
import { WorkflowStep } from "./wizard/WorkflowStep";
import { PermissionsStep } from "./wizard/PermissionsStep";
import { CommunicationStep } from "./wizard/CommunicationStep";
import { ReviewStep } from "./wizard/ReviewStep";
import type { HiringWizardData } from "../types";

interface HiringWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: HiringWizardData) => void;
}

const STEPS = [
  { id: 1, title: "Job Description", component: JobDescriptionStep },
  { id: 2, title: "Proposed Workflow", component: WorkflowStep },
  { id: 3, title: "Permissions & Integrations", component: PermissionsStep },
  { id: 4, title: "Communication & Oversight", component: CommunicationStep },
  { id: 5, title: "Review & Hire", component: ReviewStep },
];

export function HiringWizard({
  isOpen,
  onClose,
  onComplete,
}: HiringWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<HiringWizardData>({
    jobDescription: "",
    detectedVerbs: [],
    proposedWorkflow: [],
    integrations: [],
    notifications: {
      slack: { taskComplete: true, needsReview: true, error: true },
      email: { taskComplete: false, needsReview: true, error: true },
      sms: { taskComplete: false, needsReview: false, error: true },
    },
    requireApproval: true,
    slaHours: 24,
    pinToDashboard: true,
  });

  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    // Reset wizard when modal opens
    if (isOpen) {
      setCurrentStep(1);
      setCanProceed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStepData = STEPS.find((step) => step.id === currentStep);
  const StepComponent = currentStepData?.component;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      setCanProceed(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setCanProceed(true);
    }
  };

  const handleStepChange = (stepData: Partial<HiringWizardData>) => {
    setWizardData((prev) => ({ ...prev, ...stepData }));
  };

  const handleComplete = () => {
    onComplete(wizardData);
    onClose();
  };

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
              Step {currentStep} of {STEPS.length}: {currentStepData?.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-button transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div
                    className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      step.id < currentStep
                        ? "bg-success-500 text-white"
                        : step.id === currentStep
                          ? "bg-primary-600 text-white"
                          : "bg-gray-200 text-gray-600",
                    )}
                  >
                    {step.id}
                  </div>
                  <span
                    className={clsx(
                      "ml-2 text-sm font-medium",
                      step.id <= currentStep
                        ? "text-gray-900"
                        : "text-gray-500",
                    )}
                  >
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={clsx(
                      "h-0.5 w-12 rounded",
                      step.id < currentStep ? "bg-success-500" : "bg-gray-200",
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {StepComponent && (
            <StepComponent
              data={wizardData}
              onChange={handleStepChange}
              onValidityChange={setCanProceed}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={clsx(
              "inline-flex items-center px-4 py-2 text-sm font-medium rounded-button transition-colors",
              currentStep === 1
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-200",
            )}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </button>

          <span className="text-sm text-gray-500">
            {currentStep} of {STEPS.length}
          </span>

          {currentStep < STEPS.length ? (
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={clsx(
                "inline-flex items-center px-4 py-2 text-sm font-medium rounded-button transition-colors",
                canProceed
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed",
              )}
            >
              Continue
              <ArrowRight size={16} className="ml-2" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed}
              className={clsx(
                "inline-flex items-center px-6 py-2 text-sm font-medium rounded-button transition-colors",
                canProceed
                  ? "bg-success-500 text-white hover:bg-success-600"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed",
              )}
            >
              🎉 Hire AI Employee
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
