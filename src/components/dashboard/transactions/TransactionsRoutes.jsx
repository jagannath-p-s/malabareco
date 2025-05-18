import { Routes, Route } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import InwardEntries from './InwardEntries';
import SegregatedOutwardEntriesList from './SegregatedOutwardEntriesList';
import RejectedOutwardList from './RejectedOutwardList';

function TransactionsRoutes() {
  return (
    <Routes>
      {/* Inward Entries */}
      <Route path="inward" element={<InwardEntries />} />
      
      {/* Segregated Outward Entries */}
      <Route path="segregated-outward" element={<SegregatedOutwardEntriesList />} />
      
      {/* Rejected Outward Entries */}
      <Route path="rejected-outward" element={<RejectedOutwardList />} />
      
      {/* Default route */}
      <Route path="/" element={<Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Transaction Management
        </Typography>
        <Typography variant="body1">
          Select a transaction type from the sidebar.
        </Typography>
      </Box>} />
    </Routes>
  );
}

export default TransactionsRoutes;
