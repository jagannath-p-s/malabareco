import { Routes, Route } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import BankAccountsList from './BankAccountsList';
import PaymentsList from './PaymentsList';
import StaffLedger from './StaffLedger';

function FinanceRoutes() {
  return (
    <Routes>
      {/* Bank Accounts */}
      <Route path="accounts" element={<BankAccountsList />} />
      
      {/* Payments */}
      <Route path="payments" element={<PaymentsList />} />
      
      {/* Staff Ledger */}
      <Route path="staff-ledger" element={<StaffLedger />} />
      
      {/* Default route */}
      <Route path="/" element={<Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Financial Management
        </Typography>
        <Typography variant="body1">
          Select a financial management option from the sidebar.
        </Typography>
      </Box>} />
    </Routes>
  );
}

export default FinanceRoutes; 