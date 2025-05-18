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
  Grid,
  Stack,
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { supabase } from '../../../supabase';
import { format } from 'date-fns';
import { useAuth } from '../../../contexts/authcontext';

// Dialog component for creating/editing rejected waste outward entries
function RejectedWasteOutwardDialog({ open, onClose, entry = null, onSave }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [buyers, setBuyers] = useState([]);
  const [commissionAgents, setCommissionAgents] = useState([]);
  
  const [formData, setFormData] = useState({
    transaction_date: new Date(),
    buyer_id: '',
    vehicle_number: '',
    quantity: '',
    rate_per_kg: '',
    total_amount: '',
    bailing_rate_per_kg: '',
    bailing_amount: '',
    loading_rate_per_kg: '',
    loading_amount: '',
    commission_agent_id: '',
    commission_amount: '',
    is_disposal: false,
    disposal_amount: '',
    notes: ''
  });

  useEffect(() => {
    fetchBuyers();
    fetchCommissionAgents();
    if (entry) {
      setFormData({
        transaction_date: new Date(entry.transaction_date),
        buyer_id: entry.buyer_id,
        vehicle_number: entry.vehicle_number,
        quantity: entry.quantity.toString(),
        rate_per_kg: entry.rate_per_kg.toString(),
        total_amount: entry.total_amount.toString(),
        bailing_rate_per_kg: entry.bailing_rate_per_kg.toString(),
        bailing_amount: entry.bailing_amount.toString(),
        loading_rate_per_kg: entry.loading_rate_per_kg.toString(),
        loading_amount: entry.loading_amount.toString(),
        commission_agent_id: entry.commission_agent_id || '',
        commission_amount: entry.commission_amount?.toString() || '',
        is_disposal: entry.is_disposal,
        disposal_amount: entry.disposal_amount?.toString() || '',
        notes: entry.notes || ''
      });
    }
  }, [entry]);

  const fetchBuyers = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('type', 'CEMENT_COMPANY')
        .order('name');

      if (error) throw error;
      setBuyers(data || []);
    } catch (error) {
      console.error('Error fetching buyers:', error);
      setError('Failed to load buyers');
    }
  };

  const fetchCommissionAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, commission_rate')
        .eq('type', 'COMMISSION_AGENT')
        .order('name');

      if (error) throw error;
      setCommissionAgents(data || []);
    } catch (error) {
      console.error('Error fetching commission agents:', error);
      setError('Failed to load commission agents');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updates = { [field]: value };
      
      // Calculate total amount when quantity or rate changes
      if (field === 'quantity' || field === 'rate_per_kg') {
        const quantity = field === 'quantity' ? parseFloat(value) : parseFloat(prev.quantity);
        const rate = field === 'rate_per_kg' ? parseFloat(value) : parseFloat(prev.rate_per_kg);
        if (!isNaN(quantity) && !isNaN(rate)) {
          updates.total_amount = (quantity * rate).toFixed(2);
        }
      }

      // Calculate bailing amount when quantity or rate changes
      if (field === 'quantity' || field === 'bailing_rate_per_kg') {
        const quantity = field === 'quantity' ? parseFloat(value) : parseFloat(prev.quantity);
        const rate = field === 'bailing_rate_per_kg' ? parseFloat(value) : parseFloat(prev.bailing_rate_per_kg);
        if (!isNaN(quantity) && !isNaN(rate)) {
          updates.bailing_amount = (quantity * rate).toFixed(2);
        }
      }

      // Calculate loading amount when quantity or rate changes
      if (field === 'quantity' || field === 'loading_rate_per_kg') {
        const quantity = field === 'quantity' ? parseFloat(value) : parseFloat(prev.quantity);
        const rate = field === 'loading_rate_per_kg' ? parseFloat(value) : parseFloat(prev.loading_rate_per_kg);
        if (!isNaN(quantity) && !isNaN(rate)) {
          updates.loading_amount = (quantity * rate).toFixed(2);
        }
      }

      // Calculate commission amount when agent changes or total amount changes
      if (field === 'commission_agent_id' || field === 'total_amount') {
        const agent = commissionAgents.find(a => a.id === (field === 'commission_agent_id' ? value : prev.commission_agent_id));
        if (agent) {
          const amount = field === 'total_amount' ? parseFloat(value) : parseFloat(prev.total_amount);
          if (!isNaN(amount)) {
            updates.commission_amount = (amount * (agent.commission_rate / 100)).toFixed(2);
          }
        }
      }

      return { ...prev, ...updates };
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const entryData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        rate_per_kg: parseFloat(formData.rate_per_kg),
        total_amount: parseFloat(formData.total_amount),
        bailing_rate_per_kg: parseFloat(formData.bailing_rate_per_kg),
        bailing_amount: parseFloat(formData.bailing_amount),
        loading_rate_per_kg: parseFloat(formData.loading_rate_per_kg),
        loading_amount: parseFloat(formData.loading_amount),
        commission_amount: formData.commission_amount ? parseFloat(formData.commission_amount) : null,
        disposal_amount: formData.is_disposal ? parseFloat(formData.disposal_amount) : null,
        transaction_date: formData.transaction_date.toISOString()
      };

      if (entry) {
        // Update existing entry
        const { error } = await supabase
          .from('rejected_waste_outward')
          .update(entryData)
          .eq('id', entry.id);

        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase
          .from('rejected_waste_outward')
          .insert([entryData]);

        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error saving entry:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {entry ? 'Edit Rejected Waste Outward Entry' : 'New Rejected Waste Outward Entry'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Transaction Date"
                value={formData.transaction_date}
                onChange={(newValue) => handleInputChange('transaction_date', newValue)}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Buyer</InputLabel>
              <Select
                value={formData.buyer_id}
                onChange={(e) => handleInputChange('buyer_id', e.target.value)}
                label="Buyer"
              >
                {buyers.map(buyer => (
                  <MenuItem key={buyer.id} value={buyer.id}>
                    {buyer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Vehicle Number"
              value={formData.vehicle_number}
              onChange={(e) => handleInputChange('vehicle_number', e.target.value)}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Commission Agent</InputLabel>
              <Select
                value={formData.commission_agent_id}
                onChange={(e) => handleInputChange('commission_agent_id', e.target.value)}
                label="Commission Agent"
              >
                <MenuItem value="">None</MenuItem>
                {commissionAgents.map(agent => (
                  <MenuItem key={agent.id} value={agent.id}>
                    {agent.name} ({agent.commission_rate}%)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              fullWidth
              required
              InputProps={{
                endAdornment: <InputAdornment position="end">kg</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Rate per kg"
              type="number"
              value={formData.rate_per_kg}
              onChange={(e) => handleInputChange('rate_per_kg', e.target.value)}
              fullWidth
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Total Amount"
              type="number"
              value={formData.total_amount}
              InputProps={{
                readOnly: true,
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_disposal}
                  onChange={(e) => handleInputChange('is_disposal', e.target.checked)}
                />
              }
              label="This is a disposal entry"
            />
          </Grid>
          {formData.is_disposal && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Disposal Amount"
                type="number"
                value={formData.disposal_amount}
                onChange={(e) => handleInputChange('disposal_amount', e.target.value)}
                fullWidth
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Bailing Rate per kg"
              type="number"
              value={formData.bailing_rate_per_kg}
              onChange={(e) => handleInputChange('bailing_rate_per_kg', e.target.value)}
              fullWidth
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Bailing Amount"
              type="number"
              value={formData.bailing_amount}
              InputProps={{
                readOnly: true,
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Loading Rate per kg"
              type="number"
              value={formData.loading_rate_per_kg}
              onChange={(e) => handleInputChange('loading_rate_per_kg', e.target.value)}
              fullWidth
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Loading Amount"
              type="number"
              value={formData.loading_amount}
              InputProps={{
                readOnly: true,
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              fullWidth
            />
          </Grid>
          {formData.commission_agent_id && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Commission Amount"
                type="number"
                value={formData.commission_amount}
                InputProps={{
                  readOnly: true,
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                fullWidth
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Main component for listing rejected waste outward entries
function RejectedWasteOutwardEntriesList() {
  const { isAdmin, isManager } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: 'info', message: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, entryId: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    buyerId: '',
    isDisposal: ''
  });

  const fetchEntries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('rejected_waste_outward')
        .select(`
          *,
          buyer:buyer_id (
            id,
            name
          ),
          commission_agent:commission_agent_id (
            id,
            name,
            commission_rate
          )
        `)
        .order('transaction_date', { ascending: false });

      // Apply filters
      if (filters.startDate) {
        query = query.gte('transaction_date', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('transaction_date', filters.endDate.toISOString());
      }
      if (filters.buyerId) {
        query = query.eq('buyer_id', filters.buyerId);
      }
      if (filters.isDisposal !== '') {
        query = query.eq('is_disposal', filters.isDisposal === 'true');
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
      setAlert({
        show: true,
        type: 'error',
        message: `Failed to load entries: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [filters]); // Refetch when filters change

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(0);
  };

  const resetFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      buyerId: '',
      isDisposal: ''
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
        .from('rejected_waste_outward')
        .delete()
        .eq('id', deleteDialog.entryId);

      if (error) throw error;

      setAlert({
        show: true,
        type: 'success',
        message: 'Entry deleted successfully'
      });
      
      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      setAlert({
        show: true,
        type: 'error',
        message: `Failed to delete entry: ${error.message}`
      });
    } finally {
      setDeleteDialog({ open: false, entryId: null });
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesDateRange = (!filters.startDate || new Date(entry.transaction_date) >= filters.startDate) &&
                           (!filters.endDate || new Date(entry.transaction_date) <= filters.endDate);
    const matchesBuyer = !filters.buyerId || entry.buyer_id === filters.buyerId;
    const matchesDisposal = filters.isDisposal === '' || entry.is_disposal === (filters.isDisposal === 'true');
    
    return matchesDateRange && matchesBuyer && matchesDisposal;
  });

  const displayedEntries = filteredEntries
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Rejected Waste Outward Entries</Typography>

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
            onClick={() => {
              setSelectedEntry(null);
              setDialogOpen(true);
            }}
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
                  {Array.from(new Set(entries.map(entry => entry.buyer)))
                    .filter(Boolean)
                    .map(buyer => (
                      <MenuItem key={buyer.id} value={buyer.id}>
                        {buyer.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.isDisposal}
                  onChange={(e) => handleFilterChange('isDisposal', e.target.value)}
                  label="Type"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="false">Sale</MenuItem>
                  <MenuItem value="true">Disposal</MenuItem>
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
                    <TableCell>Date</TableCell>
                    <TableCell>Buyer</TableCell>
                    <TableCell>Vehicle Number</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Rate/kg</TableCell>
                    <TableCell align="right">Total Amount</TableCell>
                    <TableCell align="right">Bailing Cost</TableCell>
                    <TableCell align="right">Loading Cost</TableCell>
                    <TableCell>Commission Agent</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedEntries.map((entry) => (
                    <TableRow key={entry.id} hover>
                      <TableCell>{format(new Date(entry.transaction_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{entry.buyer?.name}</TableCell>
                      <TableCell>{entry.vehicle_number}</TableCell>
                      <TableCell align="right">{entry.quantity.toLocaleString()} kg</TableCell>
                      <TableCell align="right">{formatCurrency(entry.rate_per_kg)}</TableCell>
                      <TableCell align="right">{formatCurrency(entry.total_amount)}</TableCell>
                      <TableCell align="right">{formatCurrency(entry.bailing_amount)}</TableCell>
                      <TableCell align="right">{formatCurrency(entry.loading_amount)}</TableCell>
                      <TableCell>
                        {entry.commission_agent ? (
                          <Chip
                            label={`${entry.commission_agent.name} (${formatCurrency(entry.commission_amount)})`}
                            size="small"
                          />
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={entry.is_disposal ? 'Disposal' : 'Sale'}
                          color={entry.is_disposal ? 'error' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setDialogOpen(true);
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Entry">
                          <IconButton 
                            size="small" 
                            color="secondary"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setDialogOpen(true);
                            }}
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
                                entryId: entry.id
                              })}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {displayedEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} align="center">
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

      <RejectedWasteOutwardDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        entry={selectedEntry}
        onSave={() => {
          setDialogOpen(false);
          fetchEntries();
          setAlert({
            show: true,
            type: 'success',
            message: `Entry ${selectedEntry ? 'updated' : 'created'} successfully`
          });
        }}
      />

      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, entryId: null })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this entry? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, entryId: null })}>
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

export default RejectedWasteOutwardEntriesList; 