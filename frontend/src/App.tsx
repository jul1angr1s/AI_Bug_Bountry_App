import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import ProtocolRegistration from './pages/ProtocolRegistration';
import Protocols from './pages/Protocols';
import Scans from './pages/Scans';
import { Toaster } from './components/Toaster';

function App() {
  return (
    <>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/protocols" element={<Protocols />} />
          <Route path="/protocols/register" element={<ProtocolRegistration />} />
          <Route path="/scans" element={<Scans />} />
          <Route path="/validations" element={<div className="p-8 text-white">Validations</div>} />
          <Route path="/payments" element={<div className="p-8 text-white">Payments</div>} />
        </Routes>
      </DashboardLayout>
      <Toaster />
    </>
  );
}

export default App;
