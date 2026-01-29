import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';

function App() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<div className="p-8 text-white">Thunder Security Dashboard</div>} />
        <Route path="/protocols" element={<div className="p-8 text-white">Protocols</div>} />
        <Route path="/scans" element={<div className="p-8 text-white">Scans</div>} />
        <Route path="/validations" element={<div className="p-8 text-white">Validations</div>} />
        <Route path="/payments" element={<div className="p-8 text-white">Payments</div>} />
      </Routes>
    </DashboardLayout>
  );
}

export default App;
