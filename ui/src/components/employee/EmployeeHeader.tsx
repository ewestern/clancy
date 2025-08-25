import React from "react";
import { Bot } from "lucide-react";
import type { Employee } from "@ewestern/agents_core_sdk";

interface EmployeeHeaderProps {
  employee: Employee;
}

const EmployeeHeader: React.FC<EmployeeHeaderProps> = ({ employee }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-semibold text-slate-800">
                {employee.name}
              </h1>
              {/*
              <span className="bg-slate-100 text-slate-600 text-sm px-2 py-1 rounded">
                v2.3
              </span>
              */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeHeader;
