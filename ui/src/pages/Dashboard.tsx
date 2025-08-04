import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { KPICard } from "../components/KPICard";
import { AIEmployeeCard } from "../components/AIEmployeeCard";
import { fetchKPIData, fetchAIEmployees } from "../api/stubs";
import type { KPIData, AIEmployee } from "../types";
import { useUser } from "@clerk/react-router";

export function Dashboard() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [employees, setEmployees] = useState<AIEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [kpiResult, employeesResult] = await Promise.all([
          fetchKPIData(),
          fetchAIEmployees(),
        ]);
        setKpiData(kpiResult);
        setEmployees(employeesResult);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleChat = (employee: AIEmployee) => {
    console.log("Opening chat with:", employee.name);
    // TODO: Implement chat functionality
  };

  const handlePermissions = (employee: AIEmployee) => {
    console.log("Opening permissions for:", employee.name);
    // TODO: Implement permissions functionality
  };

  const handleDeactivate = (employee: AIEmployee) => {
    console.log("Deactivating:", employee.name);
    // TODO: Implement deactivate functionality
  };

  const handleHireEmployee = () => {
    // This will be handled by the top nav button now
    console.log("Hire button clicked - wizard should open from top nav");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero strip */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          Good morning, {user?.firstName}
          <br />
          Your team at a glance.
        </h1>
      </div>

      {/* KPI Cards */}
      {kpiData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          <KPICard
            title="AI Employees"
            value={kpiData.aiEmployees}
            badge={{
              text: `+${kpiData.aiEmployeesChange} today`,
              type: "success",
            }}
          />
          <KPICard
            title="Tasks awaiting approval"
            value={kpiData.pendingApprovals}
            badge={{
              text: "Review needed",
              type: "warning",
            }}
          />
          <KPICard
            title="Knowledge items added last 24h"
            value={kpiData.knowledgeItems}
          />
        </div>
      )}

      {/* AI Employee Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-medium text-gray-900">
            AI Employee Roster
          </h2>
          <button
            onClick={handleHireEmployee}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-button hover:bg-primary-700 transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Hire an AI Employee
          </button>
        </div>

        {/* Employee Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee) => (
            <AIEmployeeCard
              key={employee.id}
              employee={employee}
              onChat={handleChat}
              onPermissions={handlePermissions}
              onDeactivate={handleDeactivate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
