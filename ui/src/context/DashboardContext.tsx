import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { Employee } from "@ewestern/agents_core_sdk";
import type { AIEmployee } from "../types";
import { addAIEmployeeMock } from "../api/stubs";

// Convert SDK Employee to UI AIEmployee
const convertEmployeeToAIEmployee = (employee: Employee): AIEmployee => {
  // Extract role from the first agent, or use a default
  const role =
    employee.agents && employee.agents.length > 0
      ? employee.agents[0].name || "AI Employee"
      : "AI Employee";

  return {
    id: employee.id || `emp-${Date.now()}`,
    name: employee.name,
    role: role,
    lastRun: "Just created",
    status: "idle" as const, // New employees start as idle
  };
};

interface DashboardContextType {
  refreshTrigger: number;
  addEmployee: (employee: Employee) => void;
  triggerRefresh: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined,
);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const addEmployee = useCallback((employee: Employee) => {
    // Convert SDK Employee to UI AIEmployee
    const aiEmployee = convertEmployeeToAIEmployee(employee);

    // Add to mock store
    addAIEmployeeMock(aiEmployee);

    // Trigger refresh
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <DashboardContext.Provider
      value={{ refreshTrigger, addEmployee, triggerRefresh }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
