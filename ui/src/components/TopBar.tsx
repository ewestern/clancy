import { Search } from "lucide-react";
import ErrorInbox from "./ErrorInbox";
import { UserButton } from "@clerk/clerk-react";

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
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Find people or AI employees..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right side - notifications and profile */}
        <div className="flex items-center space-x-4">
          {/* Error Inbox */}
          <ErrorInbox />

          {/* Profile */}
          <UserButton />
        </div>
      </div>
    </header>
  );
}
