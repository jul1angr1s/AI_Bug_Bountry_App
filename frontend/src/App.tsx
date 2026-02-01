import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import PaymentDashboard from './pages/PaymentDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from './components/Toaster';

function App() {
  return (
    <>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/protocols" element={<div className="p-8 text-white">Protocols</div>} />
          <Route path="/scans" element={<div className="p-8 text-white">Scans</div>} />
          <Route path="/validations" element={<div className="p-8 text-white">Validations</div>} />
          <Route
            path="/payments"
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
