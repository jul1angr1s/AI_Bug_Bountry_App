import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardModern from './pages/DashboardModern';
import Validations from './pages/Validations';
import ProtocolRegistration from './pages/ProtocolRegistration';
import Protocols from './pages/Protocols';
import ProtocolDetail from './pages/ProtocolDetail';
import Scans from './pages/Scans';
import { ScanDetailRouter } from './components/scans/ScanDetailRouter';
import PaymentDashboard from './pages/PaymentDashboard';
import Payments from './pages/Payments';
import AgentRegistry from './pages/AgentRegistry';
import EscrowDashboard from './pages/EscrowDashboard';
import ReputationTracker from './pages/ReputationTracker';
import X402Payments from './pages/X402Payments';
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
          <Route path="/" element={<DashboardModern />} />
          <Route path="/protocols" element={<Protocols />} />
          <Route path="/protocols/register" element={<ProtocolRegistration />} />
          <Route path="/protocols/:id" element={<ProtocolDetail />} />
          <Route path="/scans" element={<Scans />} />
          <Route path="/scans/:id" element={<ScanDetailRouter />} />
          <Route path="/validations" element={<Validations />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/protocols/:id/payments" element={<PaymentDashboard />} />
          <Route path="/agents" element={<AgentRegistry />} />
          <Route path="/agents/:id/escrow" element={<EscrowDashboard />} />
          <Route path="/agents/:id/reputation" element={<ReputationTracker />} />
          <Route path="/x402-payments" element={<X402Payments />} />
        </Route>

        {/* REDIRECTS */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
