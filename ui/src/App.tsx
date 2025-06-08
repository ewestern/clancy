import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="employees" element={<div className="p-8 text-center text-gray-500">AI Employees page coming soon...</div>} />
          <Route path="approvals" element={<div className="p-8 text-center text-gray-500">Approvals page coming soon...</div>} />
          <Route path="knowledge" element={<div className="p-8 text-center text-gray-500">Knowledge page coming soon...</div>} />
          <Route path="settings" element={<div className="p-8 text-center text-gray-500">Settings page coming soon...</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
