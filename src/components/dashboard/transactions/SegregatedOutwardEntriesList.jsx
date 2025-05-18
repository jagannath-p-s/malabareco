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
  Stack,
  Collapse,
  Divider
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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { supabase } from '../../../supabase';
import { format } from 'date-fns';
import { useAuth } from '../../../contexts/authcontext';
import SegregatedOutwardEntryForm from './SegregatedOutwardEntryForm';

function SegregatedOutwardEntriesList() {
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
    buyerId: '',
    materialType: ''
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
      // Fetch the main entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('segregated_waste_outward')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (entriesError) throw entriesError;
      
      // Fetch all locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('*');
        
      if (locationsError) throw locationsError;
      
      // Fetch items for all entries
      const { data: itemsData, error: itemsError } = await supabase
        .from('segregated_waste_outward_items')
        .select('*');
      
      if (itemsError) throw itemsError;
      
      // Fetch labor allocations
      const { data: laborData, error: laborError } = await supabase
        .from('segregated_waste_outward_labor')
        .select('*');
      
      if (laborError) throw laborError;
      
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email');
        
      if (usersError) throw usersError;
      
      // Combine all the data manually
      const combinedData = entriesData.map(entry => {
        // Get buyer information
        const buyer = locationsData.find(loc => loc.id === entry.buyer_id) || null;
        
        // Get items for this entry
        const entryItems = itemsData.filter(item => item.outward_id === entry.id);
        
        // Get labor allocations for this entry
        const entryLabor = laborData
          .filter(labor => labor.outward_id === entry.id)
          .map(labor => {
            // Get user for each labor entry
            const user = usersData.find(user => user.id === labor.staff_id) || null;
            return {
              ...labor,
              user: user
            };
          });
          
        return {
          ...entry,
          buyer: buyer,
          items: entryItems,
          labor: entryLabor
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
      buyerId: '',
      materialType: ''
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
        .from('segregated_waste_outward')
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
    const matchesBuyer = !filters.buyerId || entry.buyer_id === filters.buyerId;
    
    // Check if any item has the selected material type
    const matchesMaterialType = !filters.materialType || (
      entry.items && entry.items.some(item => 
        item.material_type.toLowerCase() === filters.materialType.toLowerCase()
      )
    );
    
    return matchesVoucher && matchesDateRange && matchesBuyer && matchesMaterialType;
  });

  const displayedEntries = filteredEntries
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Get unique material types from all items
  const uniqueMaterialTypes = [...new Set(
    entries.flatMap(entry => entry.items?.map(item => item.material_type) || [])
  )];

  // Row component with expandable details
  function Row({ entry }) {
    const [open, setOpen] = useState(false);
    
    return (
      <>
        <TableRow hover>
          <TableCell>
            <IconButton
              size="small"
              onClick={() => setOpen(!open)}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell>
            <Typography variant="body2" fontWeight="medium">
              {entry.voucher_number}
            </Typography>
          </TableCell>
          <TableCell>{format(new Date(entry.transaction_date), 'dd/MM/yyyy')}</TableCell>
          <TableCell>
            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
              {entry.buyer?.name || 'Unknown Buyer'}
            </Typography>
          </TableCell>
          <TableCell>{entry.vehicle_number}</TableCell>
          <TableCell align="right">{entry.total_quantity.toLocaleString()} kg</TableCell>
          <TableCell align="right">{formatCurrency(entry.total_amount)}</TableCell>
          <TableCell align="right">{formatCurrency(entry.segregation_amount + entry.bailing_amount)}</TableCell>
          <TableCell align="right">{formatCurrency(entry.total_amount - entry.segregation_amount - entry.bailing_amount)}</TableCell>
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
        
        {/* Expandable detail row */}
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 1 }}>
                <Typography variant="subtitle2" gutterBottom component="div">
                  Material Items
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material Type</TableCell>
                      <TableCell align="right">Quantity (kg)</TableCell>
                      <TableCell align="right">Rate/kg</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entry.items && entry.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Chip 
                            label={item.material_type}
                            size="small"
                            color={
                              item.material_type === 'HM' ? 'primary' :
                              item.material_type === 'LD' ? 'secondary' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell align="right">{item.quantity.toLocaleString()}</TableCell>
                        <TableCell align="right">{formatCurrency(item.rate_per_kg)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {(!entry.items || entry.items.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">No material items found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                
                <Typography variant="subtitle2" gutterBottom component="div" sx={{ mt: 2 }}>
                  Labor Distribution
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Staff</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entry.labor && entry.labor.map((labor) => (
                      <TableRow key={labor.id}>
                        <TableCell>{labor.user?.email || 'Unknown Staff'}</TableCell>
                        <TableCell>{labor.labor_type}</TableCell>
                        <TableCell align="right">{formatCurrency(labor.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {(!entry.labor || entry.labor.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No labor entries found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </>
    );
  }

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
              <Typography variant="subtitle2">Buyer</Typography>
              <Typography variant="body1">{entry.buyer?.name || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Vehicle Number</Typography>
              <Typography variant="body1">{entry.vehicle_number}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Total Quantity</Typography>
              <Typography variant="body1">{entry.total_quantity.toLocaleString()} kg</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2">Total Amount</Typography>
              <Typography variant="body1">{formatCurrency(entry.total_amount)}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2">Segregation Rate</Typography>
              <Typography variant="body1">{formatCurrency(entry.segregation_rate_per_kg)}/kg</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2">Segregation Amount</Typography>
              <Typography variant="body1">{formatCurrency(entry.segregation_amount)}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2">Bailing Rate</Typography>
              <Typography variant="body1">{formatCurrency(entry.bailing_rate_per_kg)}/kg</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2">Bailing Amount</Typography>
              <Typography variant="body1">{formatCurrency(entry.bailing_amount)}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2">Net Profit</Typography>
              <Typography variant="body1" fontWeight="bold">
                {formatCurrency(entry.total_amount - entry.segregation_amount - entry.bailing_amount)}
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="subtitle2">Material Items</Typography>
              </Divider>
            </Grid>
            
            <Grid item xs={12}>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material Type</TableCell>
                      <TableCell align="right">Quantity (kg)</TableCell>
                      <TableCell align="right">Rate/kg</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entry.items && entry.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Chip 
                            label={item.material_type}
                            size="small"
                            color={
                              item.material_type === 'HM' ? 'primary' :
                              item.material_type === 'LD' ? 'secondary' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell align="right">{item.quantity.toLocaleString()}</TableCell>
                        <TableCell align="right">{formatCurrency(item.rate_per_kg)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {(!entry.items || entry.items.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">No material items found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="subtitle2">Labor Distribution</Typography>
              </Divider>
            </Grid>
            
            <Grid item xs={12}>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Staff</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entry.labor && entry.labor.map((labor) => (
                      <TableRow key={labor.id}>
                        <TableCell>{labor.user?.email || 'Unknown Staff'}</TableCell>
                        <TableCell>{labor.labor_type}</TableCell>
                        <TableCell align="right">{formatCurrency(labor.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {(!entry.labor || entry.labor.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No labor entries found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            
            {entry.notes && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Typography variant="subtitle2">Notes</Typography>
                  </Divider>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body1">{entry.notes}</Typography>
                </Grid>
              </>
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
      <Typography variant="h5" sx={{ mb: 2 }}>Segregated Waste Outward Entries</Typography>

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
                <InputLabel>Buyer</InputLabel>
                <Select
                  value={filters.buyerId}
                  onChange={(e) => handleFilterChange('buyerId', e.target.value)}
                  label="Buyer"
                >
                  <MenuItem value="">All</MenuItem>
                  {locations.map(location => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Material Type</InputLabel>
                <Select
                  value={filters.materialType}
                  onChange={(e) => handleFilterChange('materialType', e.target.value)}
                  label="Material Type"
                >
                  <MenuItem value="">All</MenuItem>
                  {uniqueMaterialTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      {type}
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
                    <TableCell padding="checkbox" />
                    <TableCell>Voucher</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Buyer</TableCell>
                    <TableCell>Vehicle</TableCell>
                    <TableCell align="right">Total Qty</TableCell>
                    <TableCell align="right">Total Amount</TableCell>
                    <TableCell align="right">Labor Cost</TableCell>
                    <TableCell align="right">Net Profit</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedEntries.map((entry) => (
                    <Row key={entry.id} entry={entry} />
                  ))}
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

      {/* Form Dialog */}
      <Dialog 
        open={formDialog.open} 
        onClose={() => setFormDialog({ open: false, entryId: null })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {formDialog.entryId ? 'Edit Segregated Waste Outward Entry' : 'New Segregated Waste Outward Entry'}
        </DialogTitle>
        <SegregatedOutwardEntryForm
          entryId={formDialog.entryId}
          onSave={handleFormSave}
          onCancel={() => setFormDialog({ open: false, entryId: null })}
          isDialog={true}
        />
      </Dialog>
    </Box>
  );
}

export default SegregatedOutwardEntriesList;