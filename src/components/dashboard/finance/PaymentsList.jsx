import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import { supabase } from '../../../supabase';
import PaymentDialog from './PaymentDialog';

function PaymentsList() {
  const [payments, setPayments] = useState([]);
  const [staffLedger, setStaffLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0); // 0: All, 1: General, 2: Staff
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    transactionType: '',
    minAmount: '',
    maxAmount: '',
    paymentMethod: ''
  });

  // Fetch payments and staff ledger on component mount
  useEffect(() => {
    fetchPayments();
    fetchStaffLedger();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          bank_accounts (id, name)
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load payments',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffLedger = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_ledger')
        .select(`
          *,
          users (id, email)
        `)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setStaffLedger(data || []);
    } catch (error) {
      console.error('Error fetching staff ledger:', error);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      transactionType: '',
      minAmount: '',
      maxAmount: '',
      paymentMethod: ''
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Filter payments based on all criteria
  const filteredPayments = payments.filter(payment => {
    // Text search
    const matchesSearch = 
      payment.reference_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.bank_accounts?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.notes?.toLowerCase().includes(searchQuery.toLowerCase());

    // Tab filter
    const matchesTab = selectedTab === 0 || 
      (selectedTab === 1 && payment.transaction_type !== 'STAFF_PAYMENT') ||
      (selectedTab === 2 && payment.transaction_type === 'STAFF_PAYMENT');

    // Date range
    const paymentDate = new Date(payment.payment_date);
    const matchesDateRange = 
      (!filters.startDate || paymentDate >= filters.startDate) &&
      (!filters.endDate || paymentDate <= filters.endDate);

    // Amount range
    const matchesAmount = 
      (!filters.minAmount || payment.amount >= parseFloat(filters.minAmount)) &&
      (!filters.maxAmount || payment.amount <= parseFloat(filters.maxAmount));

    // Transaction type
    const matchesType = !filters.transactionType || 
      payment.transaction_type === filters.transactionType;

    // Payment method
    const matchesMethod = !filters.paymentMethod || 
      payment.payment_method === filters.paymentMethod;

    return matchesSearch && matchesTab && matchesDateRange && 
           matchesAmount && matchesType && matchesMethod;
  });

  const handleDeleteClick = (payment) => {
    setPaymentToDelete(payment);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentToDelete.id);

      if (error) throw error;

      setSnackbar({
        open: true,
        message: 'Payment deleted successfully',
        severity: 'success'
      });

      fetchPayments(); // Refresh the list
    } catch (error) {
      console.error('Error deleting payment:', error);
      setSnackbar({
        open: true,
        message: `Failed to delete payment: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setDeleteConfirmOpen(false);
      setPaymentToDelete(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>
            Payment Management
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingPayment(null);
              setOpenDialog(true);
            }}
          >
            New Payment
          </Button>
        </Box>

        <Tabs 
          value={selectedTab} 
          onChange={(e, newValue) => setSelectedTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="All Payments" />
          <Tab label="General" />
          <Tab label="Staff Payments" />
        </Tabs>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <TextField
            placeholder="Search payments..."
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ maxWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            size="small"
          />
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </Stack>

        {showFilters && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={filters.startDate}
                  onChange={(newValue) => handleFilterChange('startDate', newValue)}
                  slotProps={{ textField: { size: 'small' } }}
                />
                <DatePicker
                  label="End Date"
                  value={filters.endDate}
                  onChange={(newValue) => handleFilterChange('endDate', newValue)}
                  slotProps={{ textField: { size: 'small' } }}
                />
              </LocalizationProvider>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Transaction Type</InputLabel>
                <Select
                  value={filters.transactionType}
                  onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                  label="Transaction Type"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="revenue">Revenue</MenuItem>
                  <MenuItem value="commission">Commission</MenuItem>
                  <MenuItem value="staff_payment">Staff Payment</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={filters.paymentMethod}
                  onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                  label="Payment Method"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Min Amount"
                type="number"
                size="small"
                value={filters.minAmount}
                onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                sx={{ width: 120 }}
              />
              <TextField
                label="Max Amount"
                type="number"
                size="small"
                value={filters.maxAmount}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                sx={{ width: 120 }}
              />
              <Button 
                variant="outlined" 
                onClick={resetFilters}
              >
                Reset
              </Button>
            </Stack>
          </Paper>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Bank Account</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id} hover>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell>{payment.reference_number || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={payment.transaction_type}
                          color={payment.is_credit ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{payment.bank_accounts?.name || '-'}</TableCell>
                      <TableCell align="right">
                        <Typography
                          color={payment.is_credit ? 'success.main' : 'error.main'}
                        >
                          {payment.is_credit ? '+' : '-'} {formatCurrency(payment.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell>
                        {payment.transaction_type === 'STAFF_PAYMENT' && (
                          <Chip 
                            label="Staff Payment"
                            color="primary"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => {
                            setEditingPayment(payment);
                            setOpenDialog(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="info"
                          onClick={() => {/* TODO: Implement view payment details */}}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteClick(payment)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body1" sx={{ py: 3 }}>
                        {searchQuery || showFilters ? 'No payments found matching your criteria.' : 'No payments found.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Payment Dialog */}
      <PaymentDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        payment={editingPayment}
        onSave={fetchPayments}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this payment?
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              {paymentToDelete?.bank_account_id && (
                <li>This will reverse the bank account transaction</li>
              )}
              {paymentToDelete?.transaction_type === 'STAFF_PAYMENT' && (
                <li>This will remove the staff ledger entry and update balances</li>
              )}
            </Box>
            <Box sx={{ mt: 2 }}>
              This action cannot be undone.
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PaymentsList;
