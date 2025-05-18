import React, { useState, useEffect } from 'react';
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
  Switch,
  FormControlLabel,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { format } from 'date-fns';

const RejectedOutwardEntryForm = ({ entryId = null, onSave = () => {}, onCancel = () => {}, isDialog = false }) => {
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
    recipient_id: '',
    vehicle_number: '',
    quantity: '',
    rate_per_kg: '',
    total_amount: '0',
    is_expense: false,
    bailing_rate_per_kg: '',
    bailing_amount: '0',
    loading_rate_per_kg: '',
    loading_amount: '0',
    notes: ''
  });
  
  // Labor distribution state
  const [laborAllocations, setLaborAllocations] = useState([]);
  
  useEffect(() => {
    fetchLocations();
    fetchStaffMembers();
    
    if (entryId) {
      fetchEntry(entryId);
    }
  }, [entryId]);
  
  // Calculate labor amounts when dependencies change
  useEffect(() => {
    calculateLaborAmounts();
  }, [entry.quantity, entry.bailing_rate_per_kg, entry.loading_rate_per_kg]);
  
  // Calculate total amount when quantity and rate change
  useEffect(() => {
    calculateTotalAmount();
  }, [entry.quantity, entry.rate_per_kg]);
  
  // Fetch locations from database
  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, type')
        .order('name');
        
      if (error) {
        console.error('Error fetching locations:', error);
        setError(`Failed to load locations: ${error.message}`);
        return;
      }
      
      setLocations(data || []);
    } catch (err) {
      console.error('Error in fetchLocations:', err);
      setError(`Failed to load locations: ${err.message}`);
    }
  };
  
  // Fetch staff members
  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('role', 'staff')
        .order('email');
        
      if (error) {
        console.error('Error fetching staff members:', error);
        setError(`Failed to load staff members: ${error.message}`);
        return;
      }
      
      setStaffMembers(data || []);
    } catch (err) {
      console.error('Error in fetchStaffMembers:', err);
      setError(`Failed to load staff members: ${err.message}`);
    }
  };
  
  // Fetch existing entry for editing
  const fetchEntry = async (id) => {
    setInitialLoading(true);
    try {
      // Fetch the main entry record
      const { data: entryData, error: entryError } = await supabase
        .from('rejected_waste_outward')
        .select('*')
        .eq('id', id)
        .single();
        
      if (entryError) {
        console.error('Error fetching entry:', entryError);
        setError(`Failed to load entry: ${entryError.message}`);
        setInitialLoading(false);
        return;
      }
      
      console.log('Fetched entry data:', entryData);
      
      // Fetch labor allocations
      const { data: laborData, error: laborError } = await supabase
        .from('rejected_waste_outward_labor')
        .select('*')
        .eq('outward_id', id);
        
      if (laborError) {
        console.error('Error fetching labor allocations:', laborError);
        setError(`Failed to load labor allocations: ${laborError.message}`);
        setInitialLoading(false);
        return;
      }
      
      console.log(`Fetched ${laborData?.length || 0} labor allocations`);
      
      // Set form state from fetched data
      setEntry({
        ...entryData,
        transaction_date: new Date(entryData.transaction_date)
      });
      setLaborAllocations(laborData || []);
    } catch (err) {
      console.error('Error in fetchEntry:', err);
      setError(`Failed to load entry data: ${err.message}`);
    } finally {
      setInitialLoading(false);
    }
  };
  
  // Handle input changes for main entry
  const handleChange = (field, value) => {
    setEntry(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Calculate total amount based on quantity and rate
  const calculateTotalAmount = () => {
    const quantity = parseFloat(entry.quantity) || 0;
    const ratePerKg = parseFloat(entry.rate_per_kg) || 0;
    const totalAmount = (quantity * ratePerKg).toFixed(2);
    
    setEntry(prev => ({
      ...prev,
      total_amount: totalAmount
    }));
  };
  
  // Calculate labor amounts based on rates and quantity
  const calculateLaborAmounts = () => {
    const quantity = parseFloat(entry.quantity) || 0;
    const bailingRate = parseFloat(entry.bailing_rate_per_kg) || 0;
    const loadingRate = parseFloat(entry.loading_rate_per_kg) || 0;
    
    const bailingAmount = (quantity * bailingRate).toFixed(2);
    const loadingAmount = (quantity * loadingRate).toFixed(2);
    
    setEntry(prev => ({
      ...prev,
      bailing_amount: bailingAmount,
      loading_amount: loadingAmount
    }));
    
    // If we have labor allocations, update them proportionally
    if (laborAllocations.length > 0) {
      redistributeLaborAmount();
    }
  };
  
  // Redistribute labor amount when total changes
  const redistributeLaborAmount = () => {
    // Get bailing and loading allocations
    const bailingAllocations = laborAllocations.filter(alloc => alloc.labor_type === 'BAILING');
    const loadingAllocations = laborAllocations.filter(alloc => alloc.labor_type === 'LOADING');
    
    // Calculate per-staff amounts
    const bailingAmount = parseFloat(entry.bailing_amount) || 0;
    const loadingAmount = parseFloat(entry.loading_amount) || 0;
    
    // Update bailing allocations
    if (bailingAllocations.length > 0) {
      const perStaffBailing = bailingAmount / bailingAllocations.length;
      bailingAllocations.forEach(alloc => {
        updateAllocationAmount(alloc.id, perStaffBailing.toFixed(2));
      });
    }
    
    // Update loading allocations
    if (loadingAllocations.length > 0) {
      const perStaffLoading = loadingAmount / loadingAllocations.length;
      loadingAllocations.forEach(alloc => {
        updateAllocationAmount(alloc.id, perStaffLoading.toFixed(2));
      });
    }
  };
  
  // Generate a voucher number
  const generateVoucherNumber = () => {
    const date = format(entry.transaction_date || new Date(), 'yyyyMMdd');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const voucher = `RW-${date}-${random}`;
    setGeneratedVoucher(voucher);
    return voucher;
  };
  
  // Add a staff member to labor allocations
  const addStaffMember = (staffId, laborType) => {
    if (!staffId || !laborType) return;
    
    // Check if already allocated for this type
    if (laborAllocations.some(alloc => alloc.staff_id === staffId && alloc.labor_type === laborType)) {
      setError(`This staff member already has a ${laborType.toLowerCase()} allocation`);
      return;
    }
    
    const laborAmount = laborType === 'BAILING' 
      ? parseFloat(entry.bailing_amount) 
      : parseFloat(entry.loading_amount);
      
    const typeAllocations = laborAllocations.filter(alloc => alloc.labor_type === laborType);
    const newAllocCount = typeAllocations.length + 1;
    const equalShare = laborAmount / newAllocCount;
    
    // Create new allocation
    const newAllocation = {
      id: `temp-${Date.now()}`, // Temporary ID for UI
      staff_id: staffId,
      labor_type: laborType,
      amount: equalShare.toFixed(2)
    };
    
    // Update existing allocations of the same type
    const updatedAllocations = laborAllocations.map(alloc => {
      if (alloc.labor_type === laborType) {
        return {
          ...alloc,
          amount: equalShare.toFixed(2)
        };
      }
      return alloc;
    });
    
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
    const allocationToRemove = laborAllocations.find(a => a.id === id);
    if (!allocationToRemove) return;
    
    const laborType = allocationToRemove.labor_type;
    
    // Remove the allocation
    const updatedAllocations = laborAllocations.filter(alloc => alloc.id !== id);
    setLaborAllocations(updatedAllocations);
    
    // Redistribute if any allocations of the same type remain
    const typeAllocations = updatedAllocations.filter(alloc => alloc.labor_type === laborType);
    if (typeAllocations.length > 0) {
      const laborAmount = laborType === 'BAILING' 
        ? parseFloat(entry.bailing_amount) 
        : parseFloat(entry.loading_amount);
        
      const equalShare = laborAmount / typeAllocations.length;
      
      // Update allocations of the same type
      setLaborAllocations(updatedAllocations.map(alloc => {
        if (alloc.labor_type === laborType) {
          return {
            ...alloc,
            amount: equalShare.toFixed(2)
          };
        }
        return alloc;
      }));
    }
  };
  
  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Calculate net profit/expense
  const calculateNetProfit = () => {
    const totalAmount = parseFloat(entry.total_amount) || 0;
    const bailingAmount = parseFloat(entry.bailing_amount) || 0;
    const loadingAmount = parseFloat(entry.loading_amount) || 0;
    
    if (entry.is_expense) {
      // If it's an expense, total is negative (we pay)
      return (-totalAmount - bailingAmount - loadingAmount).toFixed(2);
    } else {
      // If it's revenue, we earn total and pay labor
      return (totalAmount - bailingAmount - loadingAmount).toFixed(2);
    }
  };
  
  // Save the entry
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate form
      if (!entry.recipient_id || !entry.vehicle_number || !entry.quantity || !entry.rate_per_kg) {
        throw new Error('Please fill all required fields');
      }
      
      // Validate labor allocations
      const bailingAllocations = laborAllocations.filter(alloc => alloc.labor_type === 'BAILING');
      const loadingAllocations = laborAllocations.filter(alloc => alloc.labor_type === 'LOADING');
      
      const totalBailingAllocated = bailingAllocations.reduce((sum, alloc) => sum + parseFloat(alloc.amount || 0), 0);
      const totalLoadingAllocated = loadingAllocations.reduce((sum, alloc) => sum + parseFloat(alloc.amount || 0), 0);
      
      const bailingAmount = parseFloat(entry.bailing_amount) || 0;
      const loadingAmount = parseFloat(entry.loading_amount) || 0;
      
      if (bailingAmount > 0 && Math.abs(totalBailingAllocated - bailingAmount) > 0.01) {
        throw new Error(`Total bailing labor allocation (${formatCurrency(totalBailingAllocated)}) must equal the bailing amount (${formatCurrency(bailingAmount)})`);
      }
      
      if (loadingAmount > 0 && Math.abs(totalLoadingAllocated - loadingAmount) > 0.01) {
        throw new Error(`Total loading labor allocation (${formatCurrency(totalLoadingAllocated)}) must equal the loading amount (${formatCurrency(loadingAmount)})`);
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
        recipient_id: entry.recipient_id,
        vehicle_number: entry.vehicle_number,
        quantity: parseFloat(entry.quantity),
        rate_per_kg: parseFloat(entry.rate_per_kg),
        total_amount: parseFloat(entry.total_amount),
        is_expense: entry.is_expense,
        bailing_rate_per_kg: parseFloat(entry.bailing_rate_per_kg || 0),
        bailing_amount: parseFloat(entry.bailing_amount || 0),
        loading_rate_per_kg: parseFloat(entry.loading_rate_per_kg || 0),
        loading_amount: parseFloat(entry.loading_amount || 0),
        notes: entry.notes
      };
      
      console.log('Saving entry data:', entryData);
      
      let savedEntry;
      
      // Update or create entry
      if (entryId) {
        // Update existing entry
        console.log('Updating entry with ID:', entryId);
        const { data, error } = await supabase
          .from('rejected_waste_outward')
          .update(entryData)
          .eq('id', entryId)
          .select()
          .single();
          
        if (error) {
          console.error('Update error:', error);
          throw new Error(`Error updating entry: ${error.message}`);
        }
        savedEntry = data;
        
        // Delete existing labor allocations
        const { error: deleteLaborsError } = await supabase
          .from('rejected_waste_outward_labor')
          .delete()
          .eq('outward_id', entryId);
          
        if (deleteLaborsError) {
          console.error('Error deleting labor allocations:', deleteLaborsError);
          throw new Error(`Error deleting labor allocations: ${deleteLaborsError.message}`);
        }
      } else {
        // Create new entry
        console.log('Creating new entry');
        const { data, error } = await supabase
          .from('rejected_waste_outward')
          .insert([entryData])
          .select()
          .single();
          
        if (error) {
          console.error('Insert error:', error);
          throw new Error(`Error creating entry: ${error.message}`);
        }
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
          outward_id: savedEntry.id,
          staff_id: alloc.staff_id,
          labor_type: alloc.labor_type,
          amount: parseFloat(alloc.amount)
        }));
        
        console.log('Saving labor allocations:', laborEntries);
        const { error: laborError } = await supabase
          .from('rejected_waste_outward_labor')
          .insert(laborEntries);
          
        if (laborError) {
          console.error('Error saving labor allocations:', laborError);
          throw new Error(`Error saving labor allocations: ${laborError.message}`);
        }
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
  
  // Add a debug save function that uses direct SQL execution
  const handleDebugSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate form
      if (!entry.recipient_id || !entry.vehicle_number || !entry.quantity || !entry.rate_per_kg) {
        throw new Error('Please fill all required fields');
      }
      
      // Generate voucher number if empty
      let voucherNumber = entry.voucher_number.trim();
      if (!voucherNumber) {
        voucherNumber = generateVoucherNumber();
      }
      
      // Get exact values
      const quantity = parseFloat(entry.quantity);
      const ratePerKg = parseFloat(entry.rate_per_kg);
      const bailingRatePerKg = parseFloat(entry.bailing_rate_per_kg || 0);
      const loadingRatePerKg = parseFloat(entry.loading_rate_per_kg || 0);
      const totalAmount = quantity * ratePerKg;
      const bailingAmount = quantity * bailingRatePerKg;
      const loadingAmount = quantity * loadingRatePerKg;
      
      console.log('Debug: Using direct SQL execution');
      
      // First, just try a simple insert without RETURNING clause
      const insertQuery = `
        INSERT INTO rejected_waste_outward (
          voucher_number, 
          transaction_date, 
          recipient_id, 
          vehicle_number, 
          quantity, 
          rate_per_kg, 
          total_amount, 
          is_expense,
          bailing_rate_per_kg, 
          bailing_amount, 
          loading_rate_per_kg, 
          loading_amount, 
          notes
        ) VALUES (
          '${voucherNumber}',
          '${format(entry.transaction_date, 'yyyy-MM-dd')}',
          '${entry.recipient_id}',
          '${entry.vehicle_number}',
          ${quantity},
          ${ratePerKg},
          ${totalAmount},
          ${entry.is_expense},
          ${bailingRatePerKg},
          ${bailingAmount},
          ${loadingRatePerKg},
          ${loadingAmount},
          '${entry.notes || ""}'
        )`;
      
      // Execute the SQL statement
      const { data, error } = await supabase.rpc('execute_sql', { query: insertQuery });
      
      if (error) {
        console.error('Debug SQL error:', error);
        throw new Error(`Error saving entry with direct SQL: ${error.message}`);
      }
      
      console.log('Debug: SQL insert result', data);
      
      // Now get the ID of the record we just inserted
      const getIdQuery = `
        SELECT id FROM rejected_waste_outward 
        WHERE voucher_number = '${voucherNumber}'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const { data: idData, error: idError } = await supabase.rpc('execute_sql', { query: getIdQuery });
      
      if (idError || !idData) {
        console.error('Error getting inserted record ID:', idError);
        throw new Error('Failed to get inserted record ID');
      }
      
      console.log('Debug: Retrieved ID data', idData);
      
      if (!idData.id) {
        throw new Error('Failed to get inserted record ID');
      }
      
      const newEntryId = idData.id;
      
      // Insert labor allocations one by one
      for (const alloc of laborAllocations) {
        const laborInsertQuery = `
          INSERT INTO rejected_waste_outward_labor (
            outward_id,
            staff_id,
            labor_type,
            amount
          ) VALUES (
            '${newEntryId}',
            '${alloc.staff_id}',
            '${alloc.labor_type}',
            ${parseFloat(alloc.amount)}
          )`;
        
        const { error: laborError } = await supabase.rpc('execute_sql', { query: laborInsertQuery });
        
        if (laborError) {
          console.error('Debug labor insert error:', laborError);
          throw new Error(`Error saving labor allocation with direct SQL: ${laborError.message}`);
        }
      }
      
      setSuccess('Entry saved successfully using direct SQL execution');
      
      // Create a simple view of the result to pass back
      const savedEntry = {
        id: newEntryId,
        voucher_number: voucherNumber
      };
      
      onSave(savedEntry);
    } catch (err) {
      console.error('Debug save error:', err);
      setError(`Debug save failed: ${err.message}`);
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
            <InputLabel>Recipient</InputLabel>
            <Select
              value={entry.recipient_id}
              onChange={(e) => handleChange('recipient_id', e.target.value)}
              label="Recipient"
            >
              {locations.map(location => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </MenuItem>
              ))}
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
        
        {/* Transaction Type Toggle */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={entry.is_expense}
                onChange={(e) => handleChange('is_expense', e.target.checked)}
                color="warning"
              />
            }
            label={
              <Typography 
                variant="body1" 
                color={entry.is_expense ? "warning.main" : "success.main"}
              >
                {entry.is_expense 
                  ? "Expense (We pay for disposal)" 
                  : "Revenue (We receive payment)"}
              </Typography>
            }
          />
        </Grid>
        
        {/* Quantity and Rate */}
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
        
        {/* Labor Rates */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}>
            <Typography variant="subtitle2">Labor Rates</Typography>
          </Divider>
        </Grid>
        
        <Grid item xs={12} sm={3}>
          <TextField
            label="Bailing Rate/kg"
            type="number"
            value={entry.bailing_rate_per_kg}
            onChange={(e) => handleChange('bailing_rate_per_kg', e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              inputProps: { min: 0, step: 0.01 }
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={3}>
          <TextField
            label="Bailing Amount"
            type="number"
            value={entry.bailing_amount}
            InputProps={{
              readOnly: true,
              startAdornment: <InputAdornment position="start">₹</InputAdornment>
            }}
            fullWidth
          />
        </Grid>
        
        <Grid item xs={12} sm={3}>
          <TextField
            label="Loading Rate/kg"
            type="number"
            value={entry.loading_rate_per_kg}
            onChange={(e) => handleChange('loading_rate_per_kg', e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              inputProps: { min: 0, step: 0.01 }
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={3}>
          <TextField
            label="Loading Amount"
            type="number"
            value={entry.loading_amount}
            InputProps={{
              readOnly: true,
              startAdornment: <InputAdornment position="start">₹</InputAdornment>
            }}
            fullWidth
          />
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Typography variant="subtitle1" color={parseFloat(calculateNetProfit()) < 0 ? "error.main" : "success.main"}>
              Net {parseFloat(calculateNetProfit()) < 0 ? "Expense" : "Profit"}: {formatCurrency(Math.abs(calculateNetProfit()))}
            </Typography>
          </Box>
        </Grid>
        
        {/* Labor Distribution */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}>
            <Typography variant="subtitle2">Labor Distribution</Typography>
          </Divider>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" gutterBottom>Bailing Labor</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FormControl fullWidth sx={{ mr: 2 }}>
              <InputLabel>Add Staff for Bailing</InputLabel>
              <Select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addStaffMember(e.target.value, 'BAILING');
                    e.target.value = ""; // Reset select after selection
                  }
                }}
                label="Add Staff for Bailing"
              >
                <MenuItem value="">Select Staff</MenuItem>
                {staffMembers
                  .filter(staff => !laborAllocations.some(
                    alloc => alloc.staff_id === staff.id && alloc.labor_type === 'BAILING'
                  ))
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
              onClick={() => {
                const select = document.querySelector('[label="Add Staff for Bailing"]');
                if (select) select.focus();
              }}
            >
              Add
            </Button>
          </Box>
          
          {laborAllocations.filter(a => a.labor_type === 'BAILING').length > 0 ? (
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
                  {laborAllocations
                    .filter(alloc => alloc.labor_type === 'BAILING')
                    .map((alloc) => {
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
                        {formatCurrency(
                          laborAllocations
                            .filter(alloc => alloc.labor_type === 'BAILING')
                            .reduce((sum, alloc) => sum + parseFloat(alloc.amount || 0), 0)
                        )}
                      </strong>
                    </TableCell>
                    <TableCell align="right"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              No staff assigned for bailing labor.
            </Alert>
          )}
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" gutterBottom>Loading Labor</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FormControl fullWidth sx={{ mr: 2 }}>
              <InputLabel>Add Staff for Loading</InputLabel>
              <Select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addStaffMember(e.target.value, 'LOADING');
                    e.target.value = ""; // Reset select after selection
                  }
                }}
                label="Add Staff for Loading"
              >
                <MenuItem value="">Select Staff</MenuItem>
                {staffMembers
                  .filter(staff => !laborAllocations.some(
                    alloc => alloc.staff_id === staff.id && alloc.labor_type === 'LOADING'
                  ))
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
              onClick={() => {
                const select = document.querySelector('[label="Add Staff for Loading"]');
                if (select) select.focus();
              }}
            >
              Add
            </Button>
          </Box>
          
          {laborAllocations.filter(a => a.labor_type === 'LOADING').length > 0 ? (
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
                  {laborAllocations
                    .filter(alloc => alloc.labor_type === 'LOADING')
                    .map((alloc) => {
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
                        {formatCurrency(
                          laborAllocations
                            .filter(alloc => alloc.labor_type === 'LOADING')
                            .reduce((sum, alloc) => sum + parseFloat(alloc.amount || 0), 0)
                        )}
                      </strong>
                    </TableCell>
                    <TableCell align="right"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              No staff assigned for loading labor.
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
          
          <Button
            variant="outlined"
            color="warning"
            onClick={handleDebugSave}
            disabled={loading}
            sx={{ ml: 2 }}
          >
            Debug Save
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
        {entryId ? 'Edit Rejected Waste Outward Entry' : 'New Rejected Waste Outward Entry'}
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

export default RejectedOutwardEntryForm;