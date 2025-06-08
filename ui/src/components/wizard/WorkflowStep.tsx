import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Clock, Calendar } from "lucide-react";
import { generateWorkflow } from "../../api/stubs";
import type { HiringWizardData, WorkflowTask } from "../../types";

interface StepProps {
  data: HiringWizardData;
  onChange: (stepData: Partial<HiringWizardData>) => void;
  onValidityChange: (isValid: boolean) => void;
}

export function WorkflowStep({ data, onChange, onValidityChange }: StepProps) {
  const [proposedWorkflow, setProposedWorkflow] = useState<WorkflowTask[]>(
    data.proposedWorkflow || [],
  );
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Generate workflow when component mounts if not already generated
    if (data.jobDescription && proposedWorkflow.length === 0) {
      generateWorkflowTasks();
    }
  }, [data.jobDescription]);

  useEffect(() => {
    onValidityChange(proposedWorkflow.length > 0);
  }, [proposedWorkflow, onValidityChange]);

  const generateWorkflowTasks = async () => {
    if (!data.jobDescription) return;

    setIsLoading(true);
    try {
      const workflow = await generateWorkflow(data.jobDescription);
      setProposedWorkflow(workflow);
      onChange({ proposedWorkflow: workflow });
    } catch (error) {
      console.error("Error generating workflow:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            Generating your AI employee's workflow...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Proposed Workflow
        </h3>
        <p className="text-gray-600">
          Review the tasks your AI employee will handle. Click on any task to
          see the detailed steps.
        </p>
      </div>

      <div className="space-y-4">
        {proposedWorkflow.map((task) => {
          const isExpanded = expandedTasks.has(task.id);

          return (
            <div
              key={task.id}
              className="bg-white border border-gray-200 rounded-card shadow-sm"
            >
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleTaskExpansion(task.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <h4 className="text-lg font-medium text-gray-900">
                        {task.title}
                      </h4>

                      <div className="flex items-center space-x-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Calendar size={12} className="mr-1" />
                          {task.frequency}
                        </span>

                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Clock size={12} className="mr-1" />
                          {task.runtime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    {isExpanded ? (
                      <ChevronDown size={20} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded sub-steps */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">
                      Detailed steps:
                    </h5>
                    <ol className="space-y-2">
                      {task.subSteps.map((step, index) => (
                        <li key={index} className="flex items-start">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-primary-600 text-white text-xs font-medium rounded-full mr-3 mt-0.5 flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-sm text-gray-600">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {proposedWorkflow.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            No workflow generated yet. Please complete the job description step
            first.
          </p>
        </div>
      )}

      {proposedWorkflow.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-card p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">i</span>
              </div>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-900">
                Workflow Preview
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                This workflow is automatically generated from your job
                description. You can refine permissions and notifications in the
                next steps.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
