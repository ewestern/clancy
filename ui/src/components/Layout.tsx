import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { HiringWizard } from "./HiringWizard";
import { createAIEmployee } from "../api/stubs";
import type { HiringWizardData } from "../types";

export function Layout() {


  const [isHiringWizardOpen, setIsHiringWizardOpen] = useState(false);

  const handleHireClick = () => {
    setIsHiringWizardOpen(true);
  };

  const handleWizardComplete = async (wizardData: HiringWizardData) => {
    try {
      await createAIEmployee(wizardData);
      // Optionally show success notification
      console.log("AI Employee created successfully!");
    } catch (error) {
      console.error("Error creating AI employee:", error);
    }
  };

  const handleWizardClose = () => {
    setIsHiringWizardOpen(false);
  };


  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Fixed left rail - 72px width */}
      <Sidebar onHireClick={handleHireClick} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col ml-18">
        <TopBar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      {/* Global Hiring Wizard */}
      <HiringWizard
        isOpen={isHiringWizardOpen}
        onClose={handleWizardClose}
        onComplete={handleWizardComplete}
      />
    </div>
  );
}
