import { Routes, Route } from 'react-router-dom';
import InventoryOverview from './InventoryOverview';
import InventoryAdjustment from './InventoryAdjustment';
import InventoryHistory from './InventoryHistory';

function InventoryRoutes() {
  return (
    <Routes>
      {/* Overview (Main inventory view) */}
      <Route path="/" element={<InventoryOverview />} />
      <Route path="/adjust" element={<InventoryAdjustment />} />
      <Route path="/history" element={<InventoryHistory />} />
    </Routes>
  );
}

export default InventoryRoutes; 