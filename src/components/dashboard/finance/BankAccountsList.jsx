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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Snackbar,
  InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import HistoryIcon from '@mui/icons-material/History';
import { supabase } from '../../../supabase';
import BankTransactionDialog from './BankTransactionDialog';

function BankAccountsList() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [transactionType, setTransactionType] = useState('DEPOSIT');

  const [formData, setFormData] = useState({
    name: '',
    account_type: 'PROFIT',
    opening_balance: 0,
    current_balance: 0
  });

  const accountTypes = [
    { value: 'PROFIT', label: 'Profit Account' },
    { value: 'STAFF_PAYMENT', label: 'Payout Account' }
  ];

  // Fetch accounts on component mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load bank accounts',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name || '',
        account_type: account.account_type || 'PROFIT',
        opening_balance: account.opening_balance || 0,
        current_balance: account.current_balance || 0
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        account_type: 'PROFIT',
        opening_balance: 0,
        current_balance: 0
      });
    }
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.account_type) {
      errors.account_type = 'Account type is required';
    }
    if (isNaN(formData.opening_balance)) {
      errors.opening_balance = 'Opening balance must be a number';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const opening_balance = parseFloat(formData.opening_balance);
      
      if (editingAccount) {
        // Update existing account
        const { error } = await supabase
          .from('bank_accounts')
          .update({
            name: formData.name,
            account_type: formData.account_type,
            opening_balance: opening_balance,
            current_balance: editingAccount.id 
              ? parseFloat(formData.current_balance) 
              : opening_balance, // Only for existing accounts
            updated_at: new Date()
          })
          .eq('id', editingAccount.id);

        if (error) throw error;
        
        setSnackbar({
          open: true,
          message: 'Account updated successfully',
          severity: 'success'
        });
      } else {
        // Create new account
        const { error } = await supabase
          .from('bank_accounts')
          .insert([{
            name: formData.name,
            account_type: formData.account_type,
            opening_balance: opening_balance,
            current_balance: opening_balance // For new accounts, current = opening
          }]);

        if (error) throw error;
        
        setSnackbar({
          open: true,
          message: 'Account created successfully',
          severity: 'success'
        });
      }
      
      handleCloseDialog();
      fetchAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
      setSnackbar({
        open: true,
        message: `Failed to save account: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const handleDeleteClick = (account) => {
    setAccountToDelete(account);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;
    
    try {
      // Check if account is used in payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('id')
        .eq('bank_account_id', accountToDelete.id)
        .limit(1);
      
      if (paymentsError) throw paymentsError;
      
      if (paymentsData && paymentsData.length > 0) {
        setSnackbar({
          open: true,
          message: 'Cannot delete: This account is used in payments',
          severity: 'error'
        });
      } else {
        // Safe to delete
        const { error } = await supabase
          .from('bank_accounts')
          .delete()
          .eq('id', accountToDelete.id);
        
        if (error) throw error;
        
        setSnackbar({
          open: true,
          message: 'Account deleted successfully',
          severity: 'success'
        });
        
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setSnackbar({
        open: true,
        message: `Failed to delete account: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setDeleteConfirmOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'PROFIT':
        return 'success';
      case 'STAFF_PAYMENT':
        return 'primary';
      default:
        return 'default';
    }
  };

  const fetchTransactions = async (accountId) => {
    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select(`
          *,
          users (email)
        `)
        .eq('bank_account_id', accountId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load transaction history',
        severity: 'error'
      });
    }
  };

  const handleTransactionClick = (account, type) => {
    setSelectedAccount(account);
    setTransactionType(type);
    setShowTransactionDialog(true);
  };

  const handleTransactionHistoryClick = async (account) => {
    setSelectedAccount(account);
    await fetchTransactions(account.id);
    setShowTransactionHistory(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Bank Accounts
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Account
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : accounts.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No bank accounts have been added yet. Click "Add Account" to create your first bank account.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Opening Balance</TableCell>
                <TableCell align="right">Current Balance</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AccountBalanceIcon sx={{ mr: 1, color: 'primary.main' }} />
                      {account.name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={account.account_type === 'PROFIT' ? 'Profit Account' : 'Payout Account'} 
                      color={getTypeColor(account.account_type)} 
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{formatCurrency(account.opening_balance)}</TableCell>
                  <TableCell align="right">
                    <Typography
                      color={account.current_balance >= 0 ? 'success.main' : 'error.main'}
                      fontWeight="medium"
                    >
                      {formatCurrency(account.current_balance)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      color="success"
                      onClick={() => handleTransactionClick(account, 'DEPOSIT')}
                      size="small"
                      title="Deposit"
                    >
                      <ArrowUpwardIcon />
                    </IconButton>
                    <IconButton 
                      color="error"
                      onClick={() => handleTransactionClick(account, 'WITHDRAWAL')}
                      size="small"
                      title="Withdraw"
                    >
                      <ArrowDownwardIcon />
                    </IconButton>
                    <IconButton 
                      color="info"
                      onClick={() => handleTransactionHistoryClick(account)}
                      size="small"
                      title="Transaction History"
                    >
                      <HistoryIcon />
                    </IconButton>
                    <IconButton 
                      color="primary"
                      onClick={() => handleOpenDialog(account)}
                      size="small"
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      color="error"
                      onClick={() => handleDeleteClick(account)}
                      size="small"
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  name="name"
                  label="Account Name"
                  fullWidth
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="account_type"
                  label="Account Type"
                  select
                  fullWidth
                  required
                  value={formData.account_type}
                  onChange={handleInputChange}
                  error={!!formErrors.account_type}
                  helperText={formErrors.account_type}
                >
                  {accountTypes.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="opening_balance"
                  label="Opening Balance (₹)"
                  fullWidth
                  required
                  type="number"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  value={formData.opening_balance}
                  onChange={handleInputChange}
                  error={!!formErrors.opening_balance}
                  helperText={formErrors.opening_balance}
                  disabled={editingAccount}
                />
              </Grid>
              {editingAccount && (
                <Grid item xs={12}>
                  <TextField
                    name="current_balance"
                    label="Current Balance (₹)"
                    fullWidth
                    type="number"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    }}
                    value={formData.current_balance}
                    onChange={handleInputChange}
                    error={!!formErrors.current_balance}
                    helperText={formErrors.current_balance}
                  />
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingAccount ? 'Update' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContent>
            Are you sure you want to delete the account "{accountToDelete?.name}"? This action cannot be undone.
          </DialogContent>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction Dialog */}
      <BankTransactionDialog
        open={showTransactionDialog}
        onClose={() => setShowTransactionDialog(false)}
        bankAccount={selectedAccount}
        transactionType={transactionType}
        onSave={() => {
          fetchAccounts();
          if (showTransactionHistory) {
            fetchTransactions(selectedAccount.id);
          }
        }}
      />

      {/* Transaction History Dialog */}
      <Dialog
        open={showTransactionHistory}
        onClose={() => setShowTransactionHistory(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Transaction History - {selectedAccount?.name}
          <IconButton
            onClick={() => setShowTransactionHistory(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TableContainer sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Performed By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(transaction.transaction_date).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.transaction_type}
                        color={transaction.transaction_type === 'DEPOSIT' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        color={transaction.transaction_type === 'DEPOSIT' ? 'success.main' : 'error.main'}
                      >
                        {transaction.transaction_type === 'DEPOSIT' ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>{transaction.reference_number || '-'}</TableCell>
                    <TableCell>{transaction.description || '-'}</TableCell>
                    <TableCell>{transaction.users?.email || '-'}</TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" sx={{ py: 2 }}>
                        No transactions found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default BankAccountsList; 