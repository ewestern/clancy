import { useState } from "react";
import { MessageCircle, Shield, Pause } from "lucide-react";
import { clsx } from "clsx";
import { useNavigate } from "react-router-dom";
import type { Employee } from "@ewestern/agents_core_sdk";

interface AIEmployeeCardProps {
  employee: Employee;
  onChat: (employee: Employee) => void;
  onPermissions: (employee: Employee) => void;
  onDeactivate: (employee: Employee) => void;
}

export function AIEmployeeCard({
  employee,
  onChat,
  onPermissions,
  onDeactivate,
}: AIEmployeeCardProps) {
  const [showActions, setShowActions] = useState(false);
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success-500";
      case "inactive":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      default:
        return "Unknown";
    }
  };

  return (
    <div
      className="bg-white rounded-card p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative group cursor-pointer"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => navigate(`/employee/${employee.id}`)}
    >
      {/* Main content */}
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {employee.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 truncate mb-3">
            {employee.name}
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            {employee.agents?.length || 0} agent{employee.agents?.length !== 1 ? 's' : ''}
          </p>

          {/* Status pill */}
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
            <div
              className={clsx(
                "w-2 h-2 rounded-full mr-2",
                getStatusColor(employee.status),
              )}
            />
            {getStatusText(employee.status)}
          </span>
        </div>
      </div>

      {/* Quick actions - show on hover */}
      <div
        className={clsx(
          "absolute top-4 right-4 flex space-x-2 transition-all duration-200",
          showActions
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none",
        )}
      >
        <button
          onClick={() => onChat(employee)}
          className="p-2 bg-white rounded-button shadow-md hover:bg-gray-50 border border-gray-200 transition-colors"
          title="Chat"
        >
          <MessageCircle size={16} className="text-gray-600" />
        </button>
        <button
          onClick={() => onPermissions(employee)}
          className="p-2 bg-white rounded-button shadow-md hover:bg-gray-50 border border-gray-200 transition-colors"
          title="Permissions"
        >
          <Shield size={16} className="text-gray-600" />
        </button>
        <button
          onClick={() => onDeactivate(employee)}
          className="p-2 bg-white rounded-button shadow-md hover:bg-gray-50 border border-gray-200 transition-colors"
          title="Deactivate"
        >
          <Pause size={16} className="text-gray-600" />
        </button>
      </div>
    </div>
  );
}
