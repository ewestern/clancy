import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { Employee } from "@ewestern/agents_core_sdk";

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
    // Trigger refresh to reload data from API
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
