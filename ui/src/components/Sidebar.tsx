import { NavLink } from "react-router-dom";
import {
  Home,
  // Users,
  CheckCircle,
  BookOpen,
  Settings,
  Plus,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { icon: Home, path: "/", label: "Home" },
  // { icon: Users, path: "/employees", label: "AI Employees" },
  { icon: CheckCircle, path: "/approvals", label: "Approvals" },
  { icon: BookOpen, path: "/knowledge", label: "Knowledge" },
  { icon: Settings, path: "/settings", label: "Settings" },
];

interface SidebarProps {
  onHireClick?: () => void;
}

export function Sidebar({ onHireClick }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 w-18 h-full bg-white shadow-lg flex flex-col items-center py-4 z-10">
      {/* Logo placeholder */}
      <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center mb-8">
        <span className="text-white font-bold text-lg">C</span>
      </div>

      {/* Navigation items */}
      <nav className="flex flex-col space-y-4 flex-1">
        {navItems.map(({ icon: Icon, path, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              clsx(
                "w-10 h-10 flex items-center justify-center rounded-button transition-colors",
                "hover:bg-gray-100 relative group",
                isActive
                  ? "bg-primary-600 text-white"
                  : "text-gray-600 hover:text-gray-900",
              )
            }
          >
            <Icon size={20} />

            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
              {label}
            </div>
          </NavLink>
        ))}
      </nav>

      {/* Hire button at bottom */}
      <button
        onClick={onHireClick}
        className="w-10 h-10 flex items-center justify-center rounded-button transition-colors bg-primary-600 text-white hover:bg-primary-700 relative group"
        title="Hire AI Employee"
      >
        <Plus size={20} />

        {/* Tooltip */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
          Hire AI Employee
        </div>
      </button>
    </aside>
  );
}
