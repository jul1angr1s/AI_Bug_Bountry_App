import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Validations from './pages/Validations';
import ProtocolRegistration from './pages/ProtocolRegistration';
import Protocols from './pages/Protocols';
import ProtocolDetail from './pages/ProtocolDetail';
import Scans from './pages/Scans';
import ScanDetail from './pages/ScanDetail';
import PaymentDashboard from './pages/PaymentDashboard';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from './components/Toaster';

function App() {
  return (
    <>
      <Routes>
        {/* PUBLIC ROUTE - No layout, no auth */}
        <Route path="/login" element={<Login />} />

        {/* PROTECTED ROUTES - With DashboardLayout */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Outlet />
              </DashboardLayout>
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/protocols" element={<Protocols />} />
          <Route path="/protocols/register" element={<ProtocolRegistration />} />
          <Route path="/protocols/:id" element={<ProtocolDetail />} />
          <Route path="/scans" element={<Scans />} />
          <Route path="/scans/:id" element={<ScanDetail />} />
          <Route path="/validations" element={<Validations />} />
          <Route path="/protocols/:id/payments" element={<PaymentDashboard />} />
        </Route>

        {/* REDIRECTS */}
        <Route path="/payments" element={<Navigate to="/protocols" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
