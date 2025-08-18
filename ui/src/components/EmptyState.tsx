import { Plus, Users, Sparkles } from "lucide-react";

interface EmptyStateProps {
  onHireEmployee: () => void;
}

export function EmptyState({ onHireEmployee }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4">
      {/* Icon illustration */}
      <div className="mx-auto mb-8 relative">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users size={40} className="text-gray-400" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
          <Sparkles size={16} className="text-primary-600" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Welcome to your AI workforce
        </h3>
        <p className="text-gray-600 mb-8 leading-relaxed">
          You haven't hired any AI employees yet. Get started by creating your
          first digital team member who can handle tasks, automate workflows,
          and boost your productivity.
        </p>

        {/* Benefits list */}
        <div className="text-left mb-8 space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Automate repetitive tasks across your favorite tools
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              24/7 availability to handle urgent requests
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Seamless integration with your existing workflows
            </p>
          </div>
        </div>

        {/* Call to action */}
        <button
          onClick={onHireEmployee}
          className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-button hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Plus size={20} className="mr-2" />
          Hire your first AI Employee
        </button>

        {/* Secondary info */}
        <p className="text-xs text-gray-500 mt-4">
          Setup takes less than 5 minutes
        </p>
      </div>
    </div>
  );
}
