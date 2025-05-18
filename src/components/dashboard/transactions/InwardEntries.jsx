import React, { useState, useEffect } from 'react';
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
  Grid,
  Stack
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrintIcon from '@mui/icons-material/Print';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { supabase } from '../../../supabase';
import { format } from 'date-fns';
import { useAuth } from '../../../contexts/authcontext';
import InwardEntryForm from './InwardEntryForm';

function InwardEntries() {
  const { isAdmin, isManager } = useAuth();
  const [entries, setEntries] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: 'info', message: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, entryId: null, voucherNumber: '' });
  const [formDialog, setFormDialog] = useState({ open: false, entryId: null });
  const [viewDialog, setViewDialog] = useState({ open: false, entry: null });
  
  // Filter states
  const [filters, setFilters] = useState({
    voucherNumber: '',
    startDate: null,
    endDate: null,
    fromLocationId: '',
    toLocationId: '',
    collectionAgentId: ''
  });

  // Fetch data
  useEffect(() => {
    fetchLocations();
    fetchEntries();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');
        
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      showAlert('error', `Failed to load locations: ${error.message}`);
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      // 1. Fetch the main entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('rejected_waste_inward')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (entriesError) throw entriesError;
      
      // 2. Fetch all locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('*');
        
      if (locationsError) throw locationsError;
      
      // 3. Fetch labor entries
      const { data: laborData, error: laborError } = await supabase
        .from('rejected_waste_inward_labor')
        .select('*');
      
      if (laborError) throw laborError;
      
      // 4. Fetch users - adjust columns based on your actual users table structure
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email');
        
      if (usersError) throw usersError;
      
      // 5. Combine all the data manually
      const combinedData = entriesData.map(entry => {
        // Get related locations
        const fromLocation = locationsData.find(loc => loc.id === entry.from_location_id) || null;
        const toLocation = locationsData.find(loc => loc.id === entry.to_location_id) || null;
        const collectionAgent = locationsData.find(loc => loc.id === entry.collection_agent_id) || null;
        
        // Get related labor entries
        const entryLabor = laborData
          .filter(labor => labor.inward_id === entry.id)
          .map(labor => {
            // Get related user for each labor entry
            const user = usersData.find(user => user.id === labor.staff_id) || null;
            return {
              ...labor,
              users: user
            };
          });
          
        return {
          ...entry,
          from_location: fromLocation,
          to_location: toLocation,
          collection_agent: collectionAgent,
          rejected_waste_inward_labor: entryLabor
        };
      });
      
      setEntries(combinedData || []);
      
      // Also update the locations state while we're at it
      if (locationsData && locationsData.length > 0) {
        setLocations(locationsData);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      showAlert('error', `Failed to load entries: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    
    // Auto-hide success alerts after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 3000);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(0);
  };

  const resetFilters = () => {
    setFilters({
      voucherNumber: '',
      startDate: null,
      endDate: null,
      fromLocationId: '',
      toLocationId: '',
      collectionAgentId: ''
    });
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('rejected_waste_inward')
        .delete()
        .eq('id', deleteDialog.entryId);

      if (error) throw error;
      showAlert('success', `Entry ${deleteDialog.voucherNumber} deleted successfully`);
      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      showAlert('error', `Failed to delete entry: ${error.message}`);
    } finally {
      setDeleteDialog({ open: false, entryId: null, voucherNumber: '' });
    }
  };

  const handleFormSave = () => {
    setFormDialog({ open: false, entryId: null });
    fetchEntries();
    showAlert('success', 'Entry saved successfully');
  };

  const openForm = (entryId = null) => {
    setFormDialog({ open: true, entryId });
  };

  const openViewDialog = (entry) => {
    setViewDialog({ open: true, entry });
  };

  // Filter entries based on filters
  const filteredEntries = entries.filter(entry => {
    const matchesVoucher = entry.voucher_number.toLowerCase().includes(filters.voucherNumber.toLowerCase());
    const matchesDateRange = (!filters.startDate || new Date(entry.transaction_date) >= filters.startDate) &&
                           (!filters.endDate || new Date(entry.transaction_date) <= filters.endDate);
    const matchesFromLocation = !filters.fromLocationId || entry.from_location_id === filters.fromLocationId;
    const matchesToLocation = !filters.toLocationId || entry.to_location_id === filters.toLocationId;
    const matchesCollectionAgent = !filters.collectionAgentId || 
                                 (filters.collectionAgentId === 'none' ? entry.collection_agent_id === null : 
                                  entry.collection_agent_id === filters.collectionAgentId);
    
    return matchesVoucher && matchesDateRange && matchesFromLocation && matchesToLocation && matchesCollectionAgent;
  });

  const displayedEntries = filteredEntries
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Component for viewing entry details
  const ViewEntryDetails = ({ entry, open, onClose }) => {
    if (!entry) return null;
    
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Entry Details - {entry.voucher_number}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Transaction Date</Typography>
              <Typography variant="body1">{format(new Date(entry.transaction_date), 'dd/MM/yyyy')}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">From Location</Typography>
              <Typography variant="body1">{entry.from_location?.name || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">To Location</Typography>
              <Typography variant="body1">{entry.to_location?.name || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Collection Agent</Typography>
              <Typography variant="body1">
                {entry.collection_agent ? `${entry.collection_agent.name} (${entry.collection_agent.commission_rate} ₹/kg)` : 'None'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Vehicle Number</Typography>
              <Typography variant="body1">{entry.vehicle_number}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Quantity</Typography>
              <Typography variant="body1">{entry.quantity.toLocaleString()} kg</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2">Rate per kg</Typography>
              <Typography variant="body1">{formatCurrency(entry.rate_per_kg)}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2">Total Amount</Typography>
              <Typography variant="body1">{formatCurrency(entry.total_amount)}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2">Commission Amount</Typography>
              <Typography variant="body1">{formatCurrency(entry.commission_amount || 0)}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Labor Distribution</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Staff</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entry.rejected_waste_inward_labor && entry.rejected_waste_inward_labor.map(labor => (
                      <TableRow key={labor.id}>
                        <TableCell>
                          {labor.users ? labor.users.email : 'Unknown Staff'}
                        </TableCell>
                        <TableCell align="right">{formatCurrency(labor.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {(!entry.rejected_waste_inward_labor || entry.rejected_waste_inward_labor.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={2} align="center">No labor entries found</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Total Labor Amount</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(entry.labor_amount)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            {entry.notes && (
              <Grid item xs={12}>
                <Typography variant="subtitle2">Notes</Typography>
                <Typography variant="body1">{entry.notes}</Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            startIcon={<PrintIcon />} 
            variant="outlined"
          >
            Print Voucher
          </Button>
          <Button onClick={onClose}>Close</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              onClose();
              openForm(entry.id);
            }}
          >
            Edit
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Rejected Waste Inward Entries</Typography>

      {alert.show && (
        <Alert 
          severity={alert.type} 
          sx={{ mb: 2 }} 
          onClose={() => setAlert({ ...alert, show: false })}
        >
          {alert.message}
        </Alert>
      )}

      {/* Actions Bar */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <TextField
          placeholder="Search by voucher number..."
          value={filters.voucherNumber}
          onChange={(e) => handleFilterChange('voucherNumber', e.target.value)}
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
            onClick={() => setShowFilters(!showFilters)}
            sx={{ mr: 1 }}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openForm()}
          >
            New Entry
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      {showFilters && (
        <Paper sx={{ mb: 3, p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Date Range
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date"
                    value={filters.startDate}
                    onChange={(newValue) => handleFilterChange('startDate', newValue)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CalendarMonthIcon sx={{ mx: 1 }} color="action" />
                  </Box>
                  <DatePicker
                    label="End Date"
                    value={filters.endDate}
                    onChange={(newValue) => handleFilterChange('endDate', newValue)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </LocalizationProvider>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>From Location</InputLabel>
                <Select
                  value={filters.fromLocationId}
                  onChange={(e) => handleFilterChange('fromLocationId', e.target.value)}
                  label="From Location"
                >
                  <MenuItem value="">All</MenuItem>
                  {locations
                    .filter(loc => loc.type !== 'MRF')
                    .map(location => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>To Location</InputLabel>
                <Select
                  value={filters.toLocationId}
                  onChange={(e) => handleFilterChange('toLocationId', e.target.value)}
                  label="To Location"
                >
                  <MenuItem value="">All</MenuItem>
                  {locations
                    .filter(loc => loc.type === 'MRF')
                    .map(location => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button 
                variant="outlined" 
                onClick={resetFilters}
                fullWidth
              >
                Reset Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Data Table */}
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
                    <TableCell>Voucher</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>From → To</TableCell>
                    <TableCell>Vehicle</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Labor</TableCell>
                    <TableCell align="right">Comm.</TableCell>
                    <TableCell align="right">Profit</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedEntries.map((entry) => {
                    const profit = entry.total_amount - (entry.labor_amount || 0) - (entry.commission_amount || 0);
                    
                    return (
                      <TableRow key={entry.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {entry.voucher_number}
                          </Typography>
                        </TableCell>
                        <TableCell>{format(new Date(entry.transaction_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <Tooltip title={`From: ${entry.from_location?.name || 'Unknown'}`}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                              {entry.from_location?.name || 'Unknown'}
                            </Typography>
                          </Tooltip>
                          <Typography variant="body2" color="text.secondary">
                            → {entry.to_location?.name || 'Unknown'}
                          </Typography>
                        </TableCell>
                        <TableCell>{entry.vehicle_number}</TableCell>
                        <TableCell align="right">{entry.quantity.toLocaleString()} kg</TableCell>
                        <TableCell align="right">{formatCurrency(entry.total_amount)}</TableCell>
                        <TableCell align="right">{formatCurrency(entry.labor_amount)}</TableCell>
                        <TableCell align="right">{formatCurrency(entry.commission_amount || 0)}</TableCell>
                        <TableCell align="right">{formatCurrency(profit)}</TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => openViewDialog(entry)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Entry">
                            <IconButton 
                              size="small" 
                              color="secondary"
                              onClick={() => openForm(entry.id)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {(isAdmin || isManager) && (
                            <Tooltip title="Delete Entry">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => setDeleteDialog({
                                  open: true,
                                  entryId: entry.id,
                                  voucherNumber: entry.voucher_number
                                })}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {displayedEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        <Typography variant="body1" sx={{ py: 2 }}>
                          No entries found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredEntries.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>

      {/* Form Dialog */}
      <Dialog 
        open={formDialog.open} 
        onClose={() => setFormDialog({ open: false, entryId: null })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {formDialog.entryId ? 'Edit Waste Inward Entry' : 'New Waste Inward Entry'}
        </DialogTitle>
        <InwardEntryForm
          entryId={formDialog.entryId}
          onSave={handleFormSave}
          onCancel={() => setFormDialog({ open: false, entryId: null })}
          isDialog={true}
        />
      </Dialog>

      {/* View Entry Dialog */}
      <ViewEntryDetails 
        entry={viewDialog.entry}
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, entry: null })}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, entryId: null, voucherNumber: '' })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete entry {deleteDialog.voucherNumber}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, entryId: null, voucherNumber: '' })}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InwardEntries;