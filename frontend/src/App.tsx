import React, { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from './components/Toaster';
import LoadingSpinner from './components/shared/LoadingSpinner';
import ErrorBoundary from './components/shared/ErrorBoundary';

// Lazy-loaded page components
const DashboardModern = React.lazy(() => import('./pages/DashboardModern'));
const Validations = React.lazy(() => import('./pages/Validations'));
const ProtocolRegistration = React.lazy(() => import('./pages/ProtocolRegistration'));
const Protocols = React.lazy(() => import('./pages/Protocols'));
const ProtocolDetail = React.lazy(() => import('./pages/ProtocolDetail'));
const Scans = React.lazy(() => import('./pages/Scans'));
const ScanDetailRouter = React.lazy(() =>
  import('./components/scans/ScanDetailRouter').then(m => ({ default: m.ScanDetailRouter }))
);
const PaymentDashboard = React.lazy(() => import('./pages/PaymentDashboard'));
const Payments = React.lazy(() => import('./pages/Payments'));
const AgentRegistry = React.lazy(() => import('./pages/AgentRegistry'));
const EscrowDashboard = React.lazy(() => import('./pages/EscrowDashboard'));
const ReputationTracker = React.lazy(() => import('./pages/ReputationTracker'));
const X402Payments = React.lazy(() => import('./pages/X402Payments'));
const SmartContracts = React.lazy(() => import('./pages/SmartContracts'));

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
          <Route path="/" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><DashboardModern /></Suspense></ErrorBoundary>} />
          <Route path="/protocols" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><Protocols /></Suspense></ErrorBoundary>} />
          <Route path="/protocols/register" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><ProtocolRegistration /></Suspense></ErrorBoundary>} />
          <Route path="/protocols/:id" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><ProtocolDetail /></Suspense></ErrorBoundary>} />
          <Route path="/scans" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><Scans /></Suspense></ErrorBoundary>} />
          <Route path="/scans/:id" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><ScanDetailRouter /></Suspense></ErrorBoundary>} />
          <Route path="/validations" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><Validations /></Suspense></ErrorBoundary>} />
          <Route path="/payments" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><Payments /></Suspense></ErrorBoundary>} />
          <Route path="/protocols/:id/payments" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><PaymentDashboard /></Suspense></ErrorBoundary>} />
          <Route path="/agents" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><AgentRegistry /></Suspense></ErrorBoundary>} />
          <Route path="/agents/:id/escrow" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><EscrowDashboard /></Suspense></ErrorBoundary>} />
          <Route path="/agents/:id/reputation" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><ReputationTracker /></Suspense></ErrorBoundary>} />
          <Route path="/x402-payments" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><X402Payments /></Suspense></ErrorBoundary>} />
          <Route path="/contracts" element={<ErrorBoundary><Suspense fallback={<LoadingSpinner />}><SmartContracts /></Suspense></ErrorBoundary>} />
        </Route>

        {/* REDIRECTS */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
