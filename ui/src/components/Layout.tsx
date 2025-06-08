import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Fixed left rail - 72px width */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col ml-18">
        <TopBar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
} 