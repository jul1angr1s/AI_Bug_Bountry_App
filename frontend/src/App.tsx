import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-navy-900">
      <Routes>
        <Route path="/" element={<div className="p-8 text-white">Thunder Security Dashboard</div>} />
      </Routes>
    </div>
  );
}

export default App;
