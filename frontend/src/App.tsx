import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Validations from './pages/Validations';
import Payments from './pages/Payments';
import ProtocolRegistration from './pages/ProtocolRegistration';
import Protocols from './pages/Protocols';
import ProtocolDetail from './pages/ProtocolDetail';
import Scans from './pages/Scans';
import ScanDetail from './pages/ScanDetail';
import PaymentDashboard from './pages/PaymentDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from './components/Toaster';

function App() {
  return (
    <>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/protocols" element={<Protocols />} />
          <Route path="/protocols/register" element={<ProtocolRegistration />} />
          <Route path="/protocols/:id" element={<ProtocolDetail />} />
          <Route path="/scans" element={<Scans />} />
          <Route path="/scans/:id" element={<ScanDetail />} />
          <Route path="/validations" element={<Validations />} />
          <Route path="/payments" element={<Payments />} />
          <Route
            path="/payments/dashboard"
            element={
              <ProtectedRoute>
                <PaymentDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </DashboardLayout>
      <Toaster />
    </>
  );
}

export default App;
