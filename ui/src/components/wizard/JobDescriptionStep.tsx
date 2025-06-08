import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { analyzeJobDescription } from "../../api/stubs";
import type { HiringWizardData } from "../../types";

interface StepProps {
  data: HiringWizardData;
  onChange: (stepData: Partial<HiringWizardData>) => void;
  onValidityChange: (isValid: boolean) => void;
}

export function JobDescriptionStep({
  data,
  onChange,
  onValidityChange,
}: StepProps) {
  const [jobDescription, setJobDescription] = useState(
    data.jobDescription || "",
  );
  const [detectedVerbs, setDetectedVerbs] = useState<string[]>(
    data.detectedVerbs || [],
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    onValidityChange(jobDescription.trim().length > 20);
  }, [jobDescription, onValidityChange]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (jobDescription.trim().length > 20) {
        setIsAnalyzing(true);
        try {
          const verbs = await analyzeJobDescription(jobDescription);
          setDetectedVerbs(verbs);
          onChange({
            jobDescription,
            detectedVerbs: verbs,
          });
        } catch (error) {
          console.error("Error analyzing job description:", error);
        } finally {
          setIsAnalyzing(false);
        }
      } else {
        setDetectedVerbs([]);
        onChange({ jobDescription, detectedVerbs: [] });
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [jobDescription, onChange]);

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setJobDescription(e.target.value);
  };

  const handleGenerateProposal = () => {
    if (jobDescription.trim()) {
      onChange({
        jobDescription,
        detectedVerbs,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          What should your AI employee do?
        </h3>
        <p className="text-gray-600">
          Describe the role and responsibilities. The more detailed, the better
          we can automate it.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left column - Job description input */}
        <div className="col-span-8">
          <label
            htmlFor="jobDescription"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Job Description
          </label>
          <textarea
            id="jobDescription"
            value={jobDescription}
            onChange={handleDescriptionChange}
            placeholder="Paste or type the job description here... 

For example:
We need an AI assistant to handle our monthly invoicing process. This includes gathering billing data from our project management system, creating professional invoices, and sending them to clients for payment. The assistant should also track payment status and send follow-up reminders when necessary."
            className="w-full h-80 p-4 border border-gray-300 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-2">
            Minimum 20 characters required. Current: {jobDescription.length}
          </p>
        </div>

        {/* Right column - Live analysis */}
        <div className="col-span-4">
          <div className="bg-gray-50 rounded-card p-4 h-full">
            <div className="flex items-center mb-4">
              <Sparkles className="text-primary-600 mr-2" size={20} />
              <h4 className="font-medium text-gray-900">What we'll automate</h4>
            </div>

            {isAnalyzing ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                <span className="ml-2 text-sm text-gray-600">Analyzing...</span>
              </div>
            ) : detectedVerbs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">
                  Key automation opportunities detected:
                </p>
                <div className="flex flex-wrap gap-2">
                  {detectedVerbs.map((verb, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-600/10 text-primary-600"
                    >
                      {verb}
                    </span>
                  ))}
                </div>
              </div>
            ) : jobDescription.length > 0 ? (
              <p className="text-sm text-gray-500 italic">
                Keep typing to see what we can automate...
              </p>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Start typing to see real-time analysis of automation
                opportunities.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Generate button */}
      <div className="flex justify-center">
        <button
          onClick={handleGenerateProposal}
          disabled={jobDescription.trim().length < 20}
          className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-button hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Sparkles size={16} className="mr-2" />
          Generate Proposal
        </button>
      </div>
    </div>
  );
}
