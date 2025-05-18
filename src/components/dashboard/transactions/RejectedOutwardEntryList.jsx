import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Button,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid as MuiGrid
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaymentIcon from '@mui/icons-material/Payment';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { supabase } from '../../../supabase';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../../../contexts/authcontext';

function RejectedOutwardEntryList() {
  const navigate = useNavigate();
  const { isAdmin, isManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [locations, setLocations] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: 'info', message: '' });
  
  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    entryId: null,
    voucherNumber: '',
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    voucherNumber: '',
    startDate: null,
    endDate: null,
    fromLocationId: '',
    toLocationId: '',
    isExpense: '',
    paymentStatus: '',
  });

  // Fetch locations for filter dropdowns
  useEffect(() => {
    async function fetchLocations() {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('id, name, type')
          .order('name');
          
        if (error) throw error;
        setLocations(data || []);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    }
    
    fetchLocations();
  }, []);

  // Fetch materials
  useEffect(() => {
    async function fetchMaterials() {
      try {
        const { data, error } = await supabase
          .from('materials')
          .select('id, name')
          .order('name');
          
        if (error) throw error;
        setMaterials(data || []);
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
    }
    
    fetchMaterials();
  }, []);

  // Fetch entries
  const fetchEntries = async () => {
    setLoading(true);
    try {
      // Start building the query
      let query = supabase
        .from('rejected_waste_outward')
        .select(`
          *,
          buyer:buyer_id(id, name, type),
          commission_agent:commission_agent_id(id, name, type)
        `, { count: 'exact' });
      
      // Apply filters
      if (filters.voucherNumber) {
        query = query.ilike('voucher_number', `%${filters.voucherNumber}%`);
      }
      
      if (filters.startDate) {
        query = query.gte('entry_date', format(filters.startDate, 'yyyy-MM-dd'));
      }
      
      if (filters.endDate) {
        query = query.lte('entry_date', format(filters.endDate, 'yyyy-MM-dd'));
      }
      
      if (filters.toLocationId) {
        query = query.eq('to_location_id', filters.toLocationId);
      }
      
      if (filters.fromLocationId) {
        query = query.eq('from_location_id', filters.fromLocationId);
      }
      
      if (filters.isExpense !== '') {
        query = query.eq('is_expense', filters.isExpense === 'true');
      }
      
      if (filters.paymentStatus) {
        query = query.eq('payment_status', filters.paymentStatus);
      }
      
      // Add pagination
      const from = page * rowsPerPage;
      const to = from + rowsPerPage - 1;
      
      const { data, error, count } = await query
        .order('entry_date', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      setEntries(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching outward entries:', error);
      setAlert({
        show: true,
        type: 'error',
        message: 'Failed to load entries. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load entries on initial render and when filters/pagination change
  useEffect(() => {
    fetchEntries();
  }, [page, rowsPerPage, filters]);

  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPage(0); // Reset to first page when filters change
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      voucherNumber: '',
      startDate: null,
      endDate: null,
      fromLocationId: '',
      toLocationId: '',
      isExpense: '',
      paymentStatus: '',
    });
    setPage(0);
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Delete entry
  const confirmDelete = (id, voucherNumber) => {
    setDeleteDialog({
      open: true,
      entryId: id,
      voucherNumber,
    });
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('rejected_waste_outward')
        .delete()
        .eq('id', deleteDialog.entryId);
      
      if (error) throw error;
      
      setAlert({
        show: true,
        type: 'success',
        message: `Entry ${deleteDialog.voucherNumber} has been deleted.`,
      });
      
      // Refresh entries
      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      setAlert({
        show: true,
        type: 'error',
        message: `Failed to delete entry: ${error.message}`,
      });
    } finally {
      // Close dialog
      setDeleteDialog({
        open: false,
        entryId: null,
        voucherNumber: '',
      });
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Get color for status chip
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'complete':
        return 'success';
      case 'partial':
        return 'warning';
      case 'pending':
      default:
        return 'default';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={600}>
            Rejected Waste Outward Entries
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/dashboard/transactions/rejected-outward/new')}
          >
            New Entry
          </Button>
        </Box>

        {/* Alert message */}
        {alert.show && (
          <Alert 
            severity={alert.type} 
            sx={{ mb: 2 }}
            onClose={() => setAlert({ ...alert, show: false })}
          >
            {alert.message}
          </Alert>
        )}

        {/* Filter options */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <TextField
              placeholder="Search by voucher #"
              value={filters.voucherNumber}
              onChange={e => handleFilterChange('voucherNumber', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              size="small"
              sx={{ width: 200 }}
            />
            <Button
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              color="primary"
              variant={showFilters ? "contained" : "outlined"}
              size="small"
            >
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </Box>

          {showFilters && (
            <MuiGrid container spacing={2} sx={{ mt: 1 }}>
              <MuiGrid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>
                  Date Range
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Start Date"
                      value={filters.startDate}
                      onChange={(newValue) => handleFilterChange('startDate', newValue)}
                      slotProps={{ textField: { size: 'small', sx: { mr: 1 } } }}
                    />
                    <CalendarMonthIcon sx={{ mx: 1 }} color="action" />
                    <DatePicker
                      label="End Date"
                      value={filters.endDate}
                      onChange={(newValue) => handleFilterChange('endDate', newValue)}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                  </LocalizationProvider>
                </Box>
              </MuiGrid>
              
              <MuiGrid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>From Location</InputLabel>
                  <Select
                    value={filters.fromLocationId}
                    onChange={(e) => handleFilterChange('fromLocationId', e.target.value)}
                    label="From Location"
                  >
                    <MenuItem value="">All</MenuItem>
                    {locations
                      .filter(loc => loc.type === 'MRF')
                      .map((location) => (
                        <MenuItem key={location.id} value={location.id}>
                          {location.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </MuiGrid>
              
              <MuiGrid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>To Location</InputLabel>
                  <Select
                    value={filters.toLocationId}
                    onChange={(e) => handleFilterChange('toLocationId', e.target.value)}
                    label="To Location"
                  >
                    <MenuItem value="">All</MenuItem>
                    {locations
                      .filter(loc => ['DISPOSAL', 'BUYER'].includes(loc.type))
                      .map((location) => (
                        <MenuItem key={location.id} value={location.id}>
                          {location.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </MuiGrid>
              
              <MuiGrid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Transaction Type</InputLabel>
                  <Select
                    value={filters.isExpense}
                    onChange={(e) => handleFilterChange('isExpense', e.target.value)}
                    label="Transaction Type"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="true">Expense</MenuItem>
                    <MenuItem value="false">Revenue</MenuItem>
                  </Select>
                </FormControl>
              </MuiGrid>
              
              <MuiGrid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Status</InputLabel>
                  <Select
                    value={filters.paymentStatus}
                    onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                    label="Payment Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="complete">Complete</MenuItem>
                    <MenuItem value="partial">Partial</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </MuiGrid>
              
              <MuiGrid item xs={12} display="flex" justifyContent="flex-end">
                <Button 
                  variant="outlined" 
                  onClick={resetFilters}
                  sx={{ mr: 1 }}
                >
                  Reset Filters
                </Button>
                <Button 
                  variant="contained" 
                  onClick={fetchEntries}
                >
                  Apply Filters
                </Button>
              </MuiGrid>
            </MuiGrid>
          )}
        </Paper>

        {/* Entries Table */}
        <Paper>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Voucher #</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>From</TableCell>
                      <TableCell>To</TableCell>
                      <TableCell>Material</TableCell>
                      <TableCell align="right">Quantity (kg)</TableCell>
                      <TableCell align="right">Rate</TableCell>
                      <TableCell align="right">Total Amount</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Payment Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} align="center">
                          No entries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map(entry => (
                        <TableRow key={entry.id} hover>
                          <TableCell>{entry.voucher_number}</TableCell>
                          <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                          <TableCell>{entry.from_location?.name}</TableCell>
                          <TableCell>{entry.to_location?.name}</TableCell>
                          <TableCell>{entry.material?.name}</TableCell>
                          <TableCell align="right">{parseFloat(entry.quantity_kg).toFixed(2)}</TableCell>
                          <TableCell align="right">{formatCurrency(entry.rate_per_kg)}</TableCell>
                          <TableCell align="right">{formatCurrency(entry.total_amount)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={entry.is_expense ? "Expense" : "Revenue"} 
                              color={entry.is_expense ? "error" : "success"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={entry.payment_status.charAt(0).toUpperCase() + entry.payment_status.slice(1)} 
                              color={getStatusColor(entry.payment_status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="View Details">
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={() => navigate(`/dashboard/transactions/rejected-outward/view/${entry.id}`)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Entry">
                              <IconButton 
                                size="small" 
                                color="secondary"
                                onClick={() => navigate(`/dashboard/transactions/rejected-outward/edit/${entry.id}`)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {(isAdmin || isManager) && (
                              <Tooltip title="Delete Entry">
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => confirmDelete(entry.id, entry.voucher_number)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ ...deleteDialog, open: false })}>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete the entry with voucher number <strong>{deleteDialog.voucherNumber}</strong>? 
              This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ ...deleteDialog, open: false })} color="primary">
              Cancel
            </Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}

// Grid component for easier styling
const Grid = ({ children, container, item, ...props }) => {
  if (container) {
    return (
      <MuiGrid container spacing={2} {...props}>
        {children}
      </MuiGrid>
    );
  }
  
  // Helper function to get width based on breakpoint size
  const getWidth = (size) => {
    if (!props[size]) return {};
    
    const width = props[size] === true ? 12 : props[size];
    return { 
      [`& .MuiGrid-item`]: {
        [size === 'xs' ? 'width' : `@media (min-width: ${
          size === 'sm' ? '600px' : size === 'md' ? '900px' : '1200px'
        })`]: {
          width: `${(width / 12) * 100}%`,
        },
      }
    };
  };
  
  return (
    <MuiGrid item {...props} sx={{ 
      ...props.sx,
      ...getWidth('xs'),
      ...getWidth('sm'),
      ...getWidth('md'),
      ...getWidth('lg'),
    }}>
      {children}
    </MuiGrid>
  );
};

export default RejectedOutwardEntryList; 