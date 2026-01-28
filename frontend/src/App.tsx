import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/Dashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="protocols" element={<div>Protocols Page</div>} />
        <Route path="scans" element={<div>Scans Page</div>} />
        <Route path="validations" element={<div>Validations Page</div>} />
        <Route path="payments" element={<div>Payments Page</div>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
