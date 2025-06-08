import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import AIEmployeeProfile from "./pages/AIEmployeeProfile";
import ApprovalsQueue from "./pages/ApprovalsQueue";
import KnowledgeExplorer from "./pages/KnowledgeExplorer";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="employee/:id" element={<AIEmployeeProfile />} />
          <Route
            path="employees"
            element={
              <div className="p-8 text-center text-gray-500">
                AI Employees page coming soon...
              </div>
            }
          />
          <Route path="approvals" element={<ApprovalsQueue />} />
          <Route path="knowledge" element={<KnowledgeExplorer />} />
          <Route
            path="settings"
            element={
              <div className="p-8 text-center text-gray-500">
                Settings page coming soon...
              </div>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
