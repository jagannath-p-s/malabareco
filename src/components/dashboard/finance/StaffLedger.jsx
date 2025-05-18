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
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Collapse,
  IconButton,
  Avatar,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { supabase } from '../../../supabase';

// Row component for staff member
function StaffRow({ staff, ledgerEntries }) {
  const [open, setOpen] = useState(false);

  // Filter entries for this staff member
  const staffEntries = ledgerEntries.filter(entry => entry.staff_id === staff.id);
  
  // Calculate total balance
  const totalBalance = staffEntries.reduce((sum, entry) => {
    return sum + (entry.is_payment_to_staff ? -entry.amount : entry.amount);
  }, 0);

  // Get initials from email
  const getInitials = (email) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {getInitials(staff.email)}
            </Avatar>
            <Box>
              <Typography variant="subtitle1">{staff.email}</Typography>
              <Typography variant="caption" color="text.secondary">
                {staff.role}
              </Typography>
            </Box>
          </Stack>
        </TableCell>
        <TableCell align="right">
          <Typography
            variant="h6"
            color={totalBalance >= 0 ? 'success.main' : 'error.main'}
          >
            {formatCurrency(totalBalance)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {totalBalance >= 0 ? 'To Receive' : 'Paid'}
          </Typography>
        </TableCell>
        <TableCell align="right">
          {staffEntries.length} transactions
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Transaction History
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Payment Method</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Running Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {staffEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.transaction_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip 
                          label={entry.is_payment_to_staff ? 'Payment' : 'Commission'}
                          color={entry.is_payment_to_staff ? 'error' : 'success'}
                          size="small"
                        />
                        {entry.payments?.transaction_type && (
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                            {entry.payments.transaction_type.replace('_', ' ')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          color={entry.is_payment_to_staff ? 'error.main' : 'success.main'}
                        >
                          {entry.is_payment_to_staff ? '-' : '+'} {formatCurrency(entry.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={entry.payment_method}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {entry.reference_number || entry.payments?.reference_number || '-'}
                      </TableCell>
                      <TableCell>{entry.description || '-'}</TableCell>
                      <TableCell align="right">
                        <Typography
                          color={entry.running_balance >= 0 ? 'success.main' : 'error.main'}
                        >
                          {formatCurrency(entry.running_balance)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function StaffLedger() {
  const [loading, setLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStaffMembers();
    fetchLedgerEntries();
  }, []);

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('role', 'staff');

      if (error) throw error;
      setStaffMembers(data || []);
    } catch (error) {
      console.error('Error fetching staff members:', error);
    }
  };

  const fetchLedgerEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_ledger')
        .select(`
          *,
          users:staff_id (
            id,
            email,
            role
          ),
          payments (
            id,
            reference_number,
            payment_method,
            transaction_type
          )
        `)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setLedgerEntries(data || []);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter staff members based on search
  const filteredStaff = staffMembers.filter(staff =>
    staff.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>
            Staff Ledger
          </Typography>
          <TextField
            placeholder="Search staff..."
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            size="small"
          />
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={50} />
                  <TableCell>Staff Member</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell align="right">Transactions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staff) => (
                    <StaffRow 
                      key={staff.id} 
                      staff={staff} 
                      ledgerEntries={ledgerEntries}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body1" sx={{ py: 3 }}>
                        {searchQuery ? 'No staff members found matching your search.' : 'No staff members found.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}

export default StaffLedger; 