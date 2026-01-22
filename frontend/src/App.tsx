import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Roulette from './pages/Roulette';
import Inventory from './pages/Inventory';
import Trade from './pages/Trade';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/roulette" replace />} />
        <Route path="/roulette" element={<Roulette />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/trade" element={<Trade />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;