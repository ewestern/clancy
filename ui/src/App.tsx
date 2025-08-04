import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import AIEmployeeProfile from "./pages/AIEmployeeProfile";
import ApprovalsQueue from "./pages/ApprovalsQueue";
import KnowledgeExplorer from "./pages/KnowledgeExplorer";
import { SignIn } from "./pages/SignIn";
import { SignUp } from "./pages/SignUp";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Protected app routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
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
