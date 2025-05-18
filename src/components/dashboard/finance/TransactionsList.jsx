import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Stack,
  Divider,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { supabase } from '../../../supabase';

function TransactionsList() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [alert, setAlert] = useState({ show: false, type: 'info', message: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');
  const [creditDebitFilter, setCreditDebitFilter] = useState('all');
  const [bankAccountFilters, setBankAccountFilters] = useState([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState('all');

  // Transaction type options
  const transactionTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'material_purchase', label: 'Material Purchase' },
    { value: 'staff_payment', label: 'Staff Payment' },
    { value: 'commission', label: 'Commission' },
    { value: 'expense', label: 'Expense' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchTransactions();
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchQuery, startDate, endDate, transactionTypeFilter, creditDebitFilter, selectedBankAccount]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          bank_accounts(name)
        `)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
      setFilteredTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setAlert({
        show: true,
        type: 'error',
        message: `Failed to load transactions: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setBankAccountFilters(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        transaction =>
          transaction.description?.toLowerCase().includes(query) ||
          transaction.transaction_type?.toLowerCase().includes(query) ||
          transaction.reference_type?.toLowerCase().includes(query)
      );
    }

    // Apply date range filter
    if (startDate && endDate) {
      filtered = filtered.filter(transaction => {
        const transactionDate = parseISO(transaction.transaction_date);
        return isWithinInterval(transactionDate, {
          start: startDate,
          end: endDate
        });
      });
    }

    // Apply transaction type filter
    if (transactionTypeFilter !== 'all') {
      filtered = filtered.filter(
        transaction => transaction.transaction_type === transactionTypeFilter
      );
    }

    // Apply credit/debit filter
    if (creditDebitFilter !== 'all') {
      const isCredit = creditDebitFilter === 'credit';
      filtered = filtered.filter(transaction => transaction.is_credit === isCredit);
    }

    // Apply bank account filter
    if (selectedBankAccount !== 'all') {
      filtered = filtered.filter(transaction => transaction.bank_account_id === selectedBankAccount);
    }

    setFilteredTransactions(filtered);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleTransactionTypeChange = (event) => {
    setTransactionTypeFilter(event.target.value);
  };

  const handleCreditDebitChange = (event) => {
    setCreditDebitFilter(event.target.value);
  };

  const handleBankAccountChange = (event) => {
    setSelectedBankAccount(event.target.value);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStartDate(null);
    setEndDate(null);
    setTransactionTypeFilter('all');
    setCreditDebitFilter('all');
    setSelectedBankAccount('all');
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getTransactionTypeLabel = (type) => {
    const typeOption = transactionTypes.find(option => option.value === type);
    return typeOption ? typeOption.label : type;
  };

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'revenue':
        return 'success';
      case 'material_purchase':
        return 'info';
      case 'staff_payment':
        return 'warning';
      case 'commission':
        return 'secondary';
      case 'expense':
        return 'error';
      default:
        return 'default';
    }
  };

  const getReferenceTypeLabel = (type) => {
    switch (type) {
      case 'inward_entry':
        return 'Inward Entry';
      case 'outward_entry':
        return 'Outward Entry';
      case 'segregated_entry':
        return 'Segregated Entry';
      case 'staff_payment':
        return 'Staff Payment';
      case 'commission_payment':
        return 'Commission Payment';
      case 'expense':
        return 'Expense';
      default:
        return type;
    }
  };

  // Calculate totals
  const totalCredits = filteredTransactions
    .filter(tx => tx.is_credit)
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    
  const totalDebits = filteredTransactions
    .filter(tx => !tx.is_credit)
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    
  const netBalance = totalCredits - totalDebits;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Financial Transactions</Typography>

      {alert.show && (
        <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert({ ...alert, show: false })}>
          {alert.message}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <TextField
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={handleSearchChange}
          sx={{ flexGrow: 1, maxWidth: 500 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          size="small"
        />
        <Box>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={toggleFilters}
            sx={{ mr: 1 }}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchTransactions}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {showFilters && (
        <Paper sx={{ mb: 3, p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Date Range
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CalendarMonthIcon sx={{ mx: 1 }} color="action" />
                  </Box>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </LocalizationProvider>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={3} lg={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Transaction Type</InputLabel>
                <Select
                  value={transactionTypeFilter}
                  onChange={handleTransactionTypeChange}
                  label="Transaction Type"
                >
                  {transactionTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3} lg={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Credit/Debit</InputLabel>
                <Select
                  value={creditDebitFilter}
                  onChange={handleCreditDebitChange}
                  label="Credit/Debit"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="credit">Credits Only</MenuItem>
                  <MenuItem value="debit">Debits Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3} lg={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Bank Account</InputLabel>
                <Select
                  value={selectedBankAccount}
                  onChange={handleBankAccountChange}
                  label="Bank Account"
                >
                  <MenuItem value="all">All Accounts</MenuItem>
                  <MenuItem value={null}>Cash</MenuItem>
                  {bankAccountFilters.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3} lg={3}>
              <Button 
                variant="outlined"
                onClick={resetFilters}
                fullWidth
                sx={{ height: '100%' }}
              >
                Reset Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Credits (Income)
              </Typography>
              <Typography variant="h5" component="div" color="success.main">
                {formatAmount(totalCredits)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Debits (Expense)
              </Typography>
              <Typography variant="h5" component="div" color="error.main">
                {formatAmount(totalDebits)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Net Balance
              </Typography>
              <Typography 
                variant="h5" 
                component="div" 
                color={netBalance >= 0 ? 'success.main' : 'error.main'}
              >
                {formatAmount(netBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Debit</TableCell>
                    <TableCell align="right">Credit</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((transaction) => (
                        <TableRow key={transaction.id} hover>
                          <TableCell>
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getTransactionTypeLabel(transaction.transaction_type)}
                              color={getTransactionTypeColor(transaction.transaction_type)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getReferenceTypeLabel(transaction.reference_type)}
                              variant="outlined"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            {transaction.bank_account_id 
                              ? transaction.bank_accounts?.name 
                              : 'Cash'
                            }
                          </TableCell>
                          <TableCell align="right">
                            {!transaction.is_credit && formatAmount(transaction.amount)}
                          </TableCell>
                          <TableCell align="right">
                            {transaction.is_credit && formatAmount(transaction.amount)}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="View Details">
                              <IconButton size="small">
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredTransactions.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>
    </Box>
  );
}

export default TransactionsList; 