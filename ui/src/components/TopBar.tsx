import React from 'react';
import { Search, Bell } from 'lucide-react';

export function TopBar() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Company logo */}
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-900">Clancy</h1>
        </div>
        
        {/* Search field */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Find people or AI employees..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>
        </div>
        
        {/* Right side - notifications and profile */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-button transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>
          
          {/* Profile */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">A</span>
            </div>
            <span className="text-sm font-medium text-gray-900">Alex</span>
          </div>
        </div>
      </div>
    </header>
  );
} 