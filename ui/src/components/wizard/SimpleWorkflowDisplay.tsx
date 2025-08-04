// Simple workflow display for initial workflows phase
interface SimpleWorkflow {
  id: string;
  description: string;
  steps: string[];
  activation: string;
}

interface SimpleWorkflowDisplayProps {
  workflows: SimpleWorkflow[];
}

export function SimpleWorkflowDisplay({
  workflows,
}: SimpleWorkflowDisplayProps) {
  return (
    <div className="space-y-4">
      {workflows.map((workflow) => (
        <div
          key={workflow.id}
          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
        >
          <h4 className="font-medium text-gray-900 mb-2">
            {workflow.description}
          </h4>

          <div className="mb-3">
            <h5 className="text-sm font-medium text-gray-700 mb-1">Steps:</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              {workflow.steps.map((step, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-5 h-5 bg-primary-100 text-primary-600 rounded-full text-xs flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-1">
              Activation:
            </h5>
            <p className="text-sm text-gray-600">{workflow.activation}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export type { SimpleWorkflow };
