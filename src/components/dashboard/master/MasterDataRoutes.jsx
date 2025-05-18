import { Routes, Route } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import LocationsList from './LocationsList';
import MaterialsList from './MaterialsList';

function MasterDataRoutes() {
  return (
    <Routes>
      {/* Locations */}
      <Route path="locations" element={<LocationsList />} />
      
      {/* Materials */}
      <Route path="materials" element={<MaterialsList />} />
      
      {/* Default route */}
      <Route path="/" element={<Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Master Data Management
        </Typography>
        <Typography variant="body1">
          Select a master data type from the sidebar to manage reference data.
        </Typography>
      </Box>} />
    </Routes>
  );
}

export default MasterDataRoutes; 