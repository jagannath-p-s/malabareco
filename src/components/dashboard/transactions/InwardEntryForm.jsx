import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabase';
import {
  TextField,
  Button,
  Grid,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment,
  Table, 
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  DialogContent,
  DialogActions,
  Dialog
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { format } from 'date-fns';

const InwardEntryForm = ({ entryId = null, onSave = () => {}, onCancel = () => {}, isDialog = false }) => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!entryId);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedVoucher, setGeneratedVoucher] = useState('');
  const [isVoucherEditable, setIsVoucherEditable] = useState(true);
  
  // Reference data
  const [locations, setLocations] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  
  // Form state
  const [entry, setEntry] = useState({
    voucher_number: '',
    transaction_date: new Date(),
    from_location_id: '',
    to_location_id: '',
    collection_agent_id: null,
    vehicle_number: '',
    quantity: '',
    rate_per_kg: '',
    total_amount: '',
    labor_rate_per_kg: '',
    labor_amount: '',
    commission_amount: '0',
    notes: ''
  });
  
  // Staff labor allocation
  const [laborAllocations, setLaborAllocations] = useState([]);
  
  // Fetch reference data on component mount
  useEffect(() => {
    fetchLocations();
    fetchStaffMembers();
    
    if (entryId) {
      fetchEntry(entryId);
    }
  }, [entryId]);
  
  // Calculate derived values when dependencies change
  useEffect(() => {
    calculateTotalAmount();
    calculateLaborAmount();
  }, [entry.quantity, entry.rate_per_kg, entry.labor_rate_per_kg]);
  
  // Auto-calculate commission when collection agent changes
  useEffect(() => {
    calculateCommission();
  }, [entry.collection_agent_id, entry.quantity]);
  
  // Fetch locations from database
  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, type, district, address, contact_person, contact_number, commission_rate')
        .order('name');
        
      if (error) throw error;
      setLocations(data || []);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Failed to load locations');
    }
  };
  
  // Fetch staff members
  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('role', 'staff')
        .order('email');
        
      if (error) throw error;
      setStaffMembers(data || []);
    } catch (err) {
      console.error('Error fetching staff members:', err);
      setError('Failed to load staff members');
    }
  };
  
  // Fetch existing entry for editing
  const fetchEntry = async (id) => {
    setInitialLoading(true);
    try {
      // Fetch the main entry
      const { data: entryData, error: entryError } = await supabase
        .from('rejected_waste_inward')
        .select('id, voucher_number, transaction_date, supplier_id, collection_agent_id, vehicle_number, quantity, rate_per_kg, total_amount, labor_rate_per_kg, labor_amount, commission_amount, notes')
        .eq('id', id)
        .single();
        
      if (entryError) throw entryError;
      
      // Fetch labor allocations
      const { data: laborData, error: laborError } = await supabase
        .from('rejected_waste_inward_labor')
        .select('id, inward_id, staff_id, amount')
        .eq('inward_id', id);
        
      if (laborError) throw laborError;
      
      // Set the form data
      setEntry({
        ...entryData,
        transaction_date: new Date(entryData.transaction_date)
      });
      
      // Set labor allocations
      setLaborAllocations(laborData || []);
    } catch (err) {
      console.error('Error fetching entry:', err);
      setError('Failed to load entry data');
    } finally {
      setInitialLoading(false);
    }
  };
  
  // Handle input changes
  const handleChange = (field, value) => {
    setEntry(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Calculate total amount
  const calculateTotalAmount = () => {
    const quantity = parseFloat(entry.quantity) || 0;
    const rate = parseFloat(entry.rate_per_kg) || 0;
    
    const total = quantity * rate;
    if (!isNaN(total)) {
      setEntry(prev => ({
        ...prev,
        total_amount: total.toFixed(2)
      }));
    }
  };
  
  // Calculate labor amount
  const calculateLaborAmount = () => {
    const quantity = parseFloat(entry.quantity) || 0;
    const rate = parseFloat(entry.labor_rate_per_kg) || 0;
    
    const total = quantity * rate;
    if (!isNaN(total)) {
      setEntry(prev => ({
        ...prev,
        labor_amount: total.toFixed(2)
      }));
      
      // If we have labor allocations, update them proportionally
      if (laborAllocations.length > 0) {
        redistributeLaborAmount(total);
      }
    }
  };
  
  // Calculate commission amount
  const calculateCommission = () => {
    if (!entry.collection_agent_id) {
      setEntry(prev => ({
        ...prev,
        commission_amount: '0'
      }));
      return;
    }
    
    const agent = locations.find(loc => loc.id === entry.collection_agent_id);
    if (!agent || agent.commission_rate === null) return;
    
    const quantity = parseFloat(entry.quantity) || 0;
    const commissionRate = parseFloat(agent.commission_rate) || 0;
    
    const commission = quantity * commissionRate;
    if (!isNaN(commission)) {
      setEntry(prev => ({
        ...prev,
        commission_amount: commission.toFixed(2)
      }));
    }
  };
  
  // Redistribute labor amount among staff
  const redistributeLaborAmount = (totalAmount) => {
    // By default, distribute equally
    const perStaffAmount = totalAmount / laborAllocations.length;
    
    setLaborAllocations(prev => 
      prev.map(alloc => ({
        ...alloc,
        amount: perStaffAmount.toFixed(2)
      }))
    );
  };
  
  // Add a staff member to labor allocations
  const addStaffMember = (staffId) => {
    if (!staffId) return;
    
    // Check if already allocated
    if (laborAllocations.some(alloc => alloc.staff_id === staffId)) {
      setError('This staff member already has an allocation');
      return;
    }
    
    const laborAmount = parseFloat(entry.labor_amount) || 0;
    const newAllocCount = laborAllocations.length + 1;
    const equalShare = laborAmount / newAllocCount;
    
    // Create new allocation
    const newAllocation = {
      id: `temp-${Date.now()}`, // Temporary ID for UI
      staff_id: staffId,
      amount: equalShare.toFixed(2)
    };
    
    // Update existing allocations
    const updatedAllocations = laborAllocations.map(alloc => ({
      ...alloc,
      amount: equalShare.toFixed(2)
    }));
    
    setLaborAllocations([...updatedAllocations, newAllocation]);
  };
  
  // Update a labor allocation amount
  const updateAllocationAmount = (id, amount) => {
    setLaborAllocations(prev => 
      prev.map(alloc => 
        alloc.id === id ? { ...alloc, amount } : alloc
      )
    );
  };
  
  // Remove a labor allocation
  const removeAllocation = (id) => {
    const updatedAllocations = laborAllocations.filter(alloc => alloc.id !== id);
    setLaborAllocations(updatedAllocations);
    
    // Redistribute if any allocations remain
    if (updatedAllocations.length > 0) {
      const laborAmount = parseFloat(entry.labor_amount) || 0;
      redistributeLaborAmount(laborAmount);
    }
  };
  
  // Calculate net profit
  const calculateNetProfit = () => {
    const totalAmount = parseFloat(entry.total_amount) || 0;
    const laborAmount = parseFloat(entry.labor_amount) || 0;
    const commissionAmount = parseFloat(entry.commission_amount) || 0;
    
    return (totalAmount - laborAmount - commissionAmount).toFixed(2);
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Generate a voucher number
  const generateVoucherNumber = () => {
    const date = format(entry.transaction_date || new Date(), 'yyyyMMdd');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const voucher = `RW-${date}-${random}`;
    setGeneratedVoucher(voucher);
    return voucher;
  };
  
  // Save the entry
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate form
      if (!entry.from_location_id || !entry.to_location_id || !entry.vehicle_number || 
          !entry.quantity || !entry.rate_per_kg || !entry.labor_rate_per_kg) {
        throw new Error('Please fill all required fields');
      }
      
      // Validate labor allocations - they must equal labor amount
      const totalLaborAllocated = laborAllocations.reduce((sum, alloc) => sum + parseFloat(alloc.amount || 0), 0);
      const totalLaborAmount = parseFloat(entry.labor_amount) || 0;
      
      if (laborAllocations.length > 0 && Math.abs(totalLaborAllocated - totalLaborAmount) > 0.01) {
        throw new Error(`Total labor allocation (${formatCurrency(totalLaborAllocated)}) must equal the labor amount (${formatCurrency(totalLaborAmount)})`);
      }
      
      // Generate voucher number if empty
      let voucherNumber = entry.voucher_number.trim();
      if (!voucherNumber) {
        voucherNumber = generateVoucherNumber();
      }
      
      // Prepare data for database
      const entryData = {
        voucher_number: voucherNumber,
        transaction_date: format(entry.transaction_date, 'yyyy-MM-dd'),
        from_location_id: entry.from_location_id,
        to_location_id: entry.to_location_id,
        collection_agent_id: entry.collection_agent_id || null,
        vehicle_number: entry.vehicle_number,
        quantity: parseFloat(entry.quantity),
        rate_per_kg: parseFloat(entry.rate_per_kg),
        total_amount: parseFloat(entry.total_amount),
        labor_rate_per_kg: parseFloat(entry.labor_rate_per_kg),
        labor_amount: parseFloat(entry.labor_amount),
        commission_amount: parseFloat(entry.commission_amount),
        notes: entry.notes
      };
      
      let savedEntry;
      
      // Update or create entry
      if (entryId) {
        // Update existing entry
        const { data, error } = await supabase
          .from('rejected_waste_inward')
          .update(entryData)
          .eq('id', entryId)
          .select()
          .single();
          
        if (error) throw error;
        savedEntry = data;
        
        // Delete existing labor allocations
        await supabase
          .from('rejected_waste_inward_labor')
          .delete()
          .eq('inward_id', entryId);
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from('rejected_waste_inward')
          .insert([entryData])
          .select()
          .single();
          
        if (error) throw error;
        savedEntry = data;
        
        // Update the form with the generated voucher if we used one
        if (!entry.voucher_number.trim()) {
          setEntry(prev => ({
            ...prev,
            voucher_number: voucherNumber
          }));
        }
      }
      
      // Save labor allocations
      if (laborAllocations.length > 0) {
        const laborEntries = laborAllocations.map(alloc => ({
          inward_id: savedEntry.id,
          staff_id: alloc.staff_id,
          amount: parseFloat(alloc.amount)
        }));
        
        const { error: laborError } = await supabase
          .from('rejected_waste_inward_labor')
          .insert(laborEntries);
          
        if (laborError) throw laborError;
      }
      
      setSuccess(entryId ? 'Entry updated successfully' : 'Entry created successfully');
      onSave(savedEntry);
    } catch (err) {
      console.error('Error saving entry:', err);
      setError(err.message || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };
  
  const renderForm = () => (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Voucher Number"
                  value={entry.voucher_number}
                  onChange={(e) => handleChange('voucher_number', e.target.value)}
                  fullWidth
                  placeholder="Auto-generated if left empty"
                  helperText={
                    generatedVoucher && !entry.voucher_number 
                      ? `Will be generated as: ${generatedVoucher}` 
                      : "Leave empty for auto-generation"
                  }
                  InputProps={{
                    endAdornment: entry.voucher_number ? (
                      <InputAdornment position="end">
                        <Tooltip title="Edit">
                          <IconButton
                            edge="end"
                            onClick={() => setIsVoucherEditable(!isVoucherEditable)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ) : null,
                    readOnly: !isVoucherEditable && !!entry.voucher_number
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Transaction Date"
                    value={entry.transaction_date}
                    onChange={(date) => handleChange('transaction_date', date)}
                    renderInput={(params) => <TextField {...params} fullWidth required />}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>
          </Box>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>From Location</InputLabel>
            <Select
              value={entry.from_location_id}
              onChange={(e) => handleChange('from_location_id', e.target.value)}
              label="From Location"
            >
              {locations
                .filter(loc => loc.id !== entry.to_location_id)
                .map(location => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name} ({location.type})
                  </MenuItem>
                ))
              }
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>To Location (MRF)</InputLabel>
            <Select
              value={entry.to_location_id}
              onChange={(e) => handleChange('to_location_id', e.target.value)}
              label="To Location (MRF)"
            >
              {locations
                .filter(loc => loc.type === 'MRF' && loc.id !== entry.from_location_id)
                .map(location => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))
              }
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Collection Agent</InputLabel>
            <Select
              value={entry.collection_agent_id || ''}
              onChange={(e) => handleChange('collection_agent_id', e.target.value || null)}
              label="Collection Agent"
            >
              <MenuItem value="">None</MenuItem>
              {locations
                .filter(loc => loc.commission_rate !== null)
                .map(location => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name} (₹{location.commission_rate}/kg)
                  </MenuItem>
                ))
              }
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            label="Vehicle Number"
            value={entry.vehicle_number}
            onChange={(e) => handleChange('vehicle_number', e.target.value)}
            fullWidth
            required
          />
        </Grid>
        
        {/* Quantity and Rates */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}>
            <Typography variant="subtitle2">Quantity and Rates</Typography>
          </Divider>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            label="Quantity (kg)"
            type="number"
            value={entry.quantity}
            onChange={(e) => handleChange('quantity', e.target.value)}
            fullWidth
            required
            InputProps={{
              inputProps: { min: 0, step: 0.01 }
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            label="Rate per kg"
            type="number"
            value={entry.rate_per_kg}
            onChange={(e) => handleChange('rate_per_kg', e.target.value)}
            fullWidth
            required
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              inputProps: { min: 0, step: 0.01 }
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            label="Total Amount"
            type="number"
            value={entry.total_amount}
            InputProps={{
              readOnly: true,
              startAdornment: <InputAdornment position="start">₹</InputAdornment>
            }}
            fullWidth
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            label="Labor Rate per kg"
            type="number"
            value={entry.labor_rate_per_kg}
            onChange={(e) => handleChange('labor_rate_per_kg', e.target.value)}
            fullWidth
            required
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              inputProps: { min: 0, step: 0.01 }
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            label="Labor Amount"
            type="number"
            value={entry.labor_amount}
            InputProps={{
              readOnly: true,
              startAdornment: <InputAdornment position="start">₹</InputAdornment>
            }}
            fullWidth
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            label="Commission Amount"
            type="number"
            value={entry.commission_amount}
            InputProps={{
              readOnly: true,
              startAdornment: <InputAdornment position="start">₹</InputAdornment>
            }}
            fullWidth
          />
        </Grid>
        
        <Grid item xs={12} sm={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1">
              Net Profit: {formatCurrency(calculateNetProfit())}
            </Typography>
          </Box>
        </Grid>
        
        {/* Labor Distribution */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}>
            <Typography variant="subtitle2">Labor Distribution</Typography>
          </Divider>
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FormControl fullWidth sx={{ mr: 2 }}>
              <InputLabel>Add Staff Member</InputLabel>
              <Select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addStaffMember(e.target.value);
                    e.target.value = ""; // Reset select after selection
                  }
                }}
                label="Add Staff Member"
              >
                <MenuItem value="">Select Staff</MenuItem>
                {staffMembers
                  .filter(staff => !laborAllocations.some(alloc => alloc.staff_id === staff.id))
                  .map(staff => (
                    <MenuItem key={staff.id} value={staff.id}>
                      {staff.email || staff.name}
                    </MenuItem>
                  ))
                }
              </Select>
            </FormControl>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={() => {
                const select = document.querySelector('[label="Add Staff Member"]');
                if (select) select.focus();
              }}
            >
              Add
            </Button>
          </Box>
          
          {laborAllocations.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Staff Member</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {laborAllocations.map((alloc) => {
                    const staff = staffMembers.find(s => s.id === alloc.staff_id);
                    return (
                      <TableRow key={alloc.id}>
                        <TableCell>{staff ? (staff.email || staff.name) : 'Unknown Staff'}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            value={alloc.amount}
                            onChange={(e) => updateAllocationAmount(alloc.id, e.target.value)}
                            size="small"
                            InputProps={{
                              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              inputProps: { min: 0, step: 0.01, style: { textAlign: 'right' } }
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Remove">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => removeAllocation(alloc.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell><strong>Total</strong></TableCell>
                    <TableCell align="right">
                      <strong>
                        {formatCurrency(laborAllocations.reduce((sum, alloc) => sum + parseFloat(alloc.amount || 0), 0))}
                      </strong>
                    </TableCell>
                    <TableCell align="right"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              No staff members assigned for labor. Please add staff members to distribute labor charges.
            </Alert>
          )}
        </Grid>
        
        {/* Notes */}
        <Grid item xs={12}>
          <TextField
            label="Notes"
            value={entry.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
        </Grid>
        
        {/* Submit Button */}
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ mr: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : (entryId ? 'Update' : 'Submit')}
          </Button>
          
          <Button
            variant="outlined"
            color="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </Grid>
      </Grid>
    </form>
  );
  
  if (initialLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (isDialog) {
    return (
      <>
        <DialogContent dividers sx={{ p: 3, maxHeight: '70vh', overflowY: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          {renderForm()}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onCancel} color="secondary">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            color="primary" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (entryId ? 'Update' : 'Save')}
          </Button>
        </DialogActions>
      </>
    );
  }
  
  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {entryId ? 'Edit Waste Inward Entry' : 'New Waste Inward Entry'}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      {renderForm()}
    </Paper>
  );
};

export default InwardEntryForm;