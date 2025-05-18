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
  Chip,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { format } from 'date-fns';

const SegregatedOutwardEntryForm = ({ entryId = null, onSave = () => {}, onCancel = () => {}, isDialog = false }) => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!entryId);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedVoucher, setGeneratedVoucher] = useState('');
  const [isVoucherEditable, setIsVoucherEditable] = useState(true);
  
  // Reference data
  const [locations, setLocations] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [materialTypes, setMaterialTypes] = useState(['HM', 'LD', 'Other']);
  
  // Form state
  const [entry, setEntry] = useState({
    voucher_number: '',
    transaction_date: new Date(),
    buyer_id: '',
    vehicle_number: '',
    total_quantity: '0',
    total_amount: '0',
    segregation_rate_per_kg: '',
    segregation_amount: '0',
    bailing_rate_per_kg: '',
    bailing_amount: '0',
    notes: ''
  });
  
  // Material items state
  const [items, setItems] = useState([]);
  
  // Labor distribution state
  const [laborAllocations, setLaborAllocations] = useState([]);
  
  // Add new item dialog
  const [itemDialog, setItemDialog] = useState({
    open: false,
    item: {
      id: '',
      material_type: '',
      quantity: '',
      rate_per_kg: '',
      amount: '0'
    },
    isEdit: false
  });
  
  // Fetch reference data on component mount
  useEffect(() => {
    fetchLocations();
    fetchStaffMembers();
    
    if (entryId) {
      fetchEntry(entryId);
    }
  }, [entryId]);
  
  // Calculate derived values when items change
  useEffect(() => {
    calculateTotals();
  }, [items]);
  
  // Calculate labor amounts when dependencies change
  useEffect(() => {
    calculateLaborAmounts();
  }, [entry.total_quantity, entry.segregation_rate_per_kg, entry.bailing_rate_per_kg]);
  
  // Fetch locations from database
  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
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
        .select('*')
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
        .from('segregated_waste_outward')
        .select('*')
        .eq('id', id)
        .single();
        
      if (entryError) throw entryError;
      
      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('segregated_waste_outward_items')
        .select('*')
        .eq('outward_id', id);
        
      if (itemsError) throw itemsError;
      
      // Fetch labor allocations
      const { data: laborData, error: laborError } = await supabase
        .from('segregated_waste_outward_labor')
        .select('*')
        .eq('outward_id', id);
        
      if (laborError) throw laborError;
      
      // Set the form data
      setEntry({
        ...entryData,
        transaction_date: new Date(entryData.transaction_date)
      });
      
      // Set items
      setItems(itemsData || []);
      
      // Set labor allocations
      setLaborAllocations(laborData || []);
    } catch (err) {
      console.error('Error fetching entry:', err);
      setError('Failed to load entry data');
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
  
  // Open item dialog
  const openItemDialog = (item = null) => {
    if (item) {
      setItemDialog({
        open: true,
        item: { ...item },
        isEdit: true
      });
    } else {
      setItemDialog({
        open: true,
        item: {
          id: `temp-${Date.now()}`,
          material_type: '',
          quantity: '',
          rate_per_kg: '',
          amount: '0'
        },
        isEdit: false
      });
    }
  };
  
  // Handle item dialog input changes
  const handleItemChange = (field, value) => {
    setItemDialog(prev => {
      const updatedItem = {
        ...prev.item,
        [field]: value
      };
      
      // Auto-calculate amount if quantity and rate are present
      if (field === 'quantity' || field === 'rate_per_kg') {
        const quantity = parseFloat(updatedItem.quantity) || 0;
        const rate = parseFloat(updatedItem.rate_per_kg) || 0;
        updatedItem.amount = (quantity * rate).toFixed(2);
      }
      
      return {
        ...prev,
        item: updatedItem
      };
    });
  };
  
  // Save item from dialog
  const saveItem = () => {
    const newItem = itemDialog.item;
    
    // Validate item
    if (!newItem.material_type || !newItem.quantity || !newItem.rate_per_kg) {
      setError('Please fill all required fields for the material item');
      return;
    }
    
    if (itemDialog.isEdit) {
      // Update existing item
      setItems(prev => prev.map(item => 
        item.id === newItem.id ? newItem : item
      ));
    } else {
      // Add new item
      setItems(prev => [...prev, newItem]);
    }
    
    // Close dialog
    setItemDialog(prev => ({
      ...prev,
      open: false
    }));
  };
  
  // Delete an item
  const deleteItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };
  
  // Calculate totals based on items
  const calculateTotals = () => {
    const totalQuantity = items.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);
    const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    
    setEntry(prev => ({
      ...prev,
      total_quantity: totalQuantity.toFixed(2),
      total_amount: totalAmount.toFixed(2)
    }));
  };
  
  // Calculate labor amounts
  const calculateLaborAmounts = () => {
    const quantity = parseFloat(entry.total_quantity) || 0;
    const segregationRate = parseFloat(entry.segregation_rate_per_kg) || 0;
    const bailingRate = parseFloat(entry.bailing_rate_per_kg) || 0;
    
    // Ensure exact calculations
    const segregationAmount = (quantity * segregationRate).toFixed(2);
    const bailingAmount = (quantity * bailingRate).toFixed(2);
    
    setEntry(prev => ({
      ...prev,
      segregation_amount: segregationAmount,
      bailing_amount: bailingAmount
    }));
    
    // If we have labor allocations, update them proportionally
    if (laborAllocations.length > 0) {
      redistributeLaborAmount();
    }
  };
  
  // Generate a voucher number
  const generateVoucherNumber = () => {
    const date = format(entry.transaction_date || new Date(), 'yyyyMMdd');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const voucher = `SW-${date}-${random}`;
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
    
    const laborAmount = laborType === 'SEGREGATION' 
      ? parseFloat(entry.segregation_amount) 
      : parseFloat(entry.bailing_amount);
      
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
      const laborAmount = laborType === 'SEGREGATION' 
        ? parseFloat(entry.segregation_amount) 
        : parseFloat(entry.bailing_amount);
        
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
  
  // Redistribute labor amount
  const redistributeLaborAmount = () => {
    // Get segregation and bailing allocations
    const segregationAllocations = laborAllocations.filter(alloc => alloc.labor_type === 'SEGREGATION');
    const bailingAllocations = laborAllocations.filter(alloc => alloc.labor_type === 'BAILING');
    
    // Calculate per-staff amounts
    const segregationAmount = parseFloat(entry.segregation_amount) || 0;
    const bailingAmount = parseFloat(entry.bailing_amount) || 0;
    
    // Update segregation allocations
    if (segregationAllocations.length > 0) {
      const perStaffSegregation = segregationAmount / segregationAllocations.length;
      segregationAllocations.forEach(alloc => {
        updateAllocationAmount(alloc.id, perStaffSegregation.toFixed(2));
      });
    }
    
    // Update bailing allocations
    if (bailingAllocations.length > 0) {
      const perStaffBailing = bailingAmount / bailingAllocations.length;
      bailingAllocations.forEach(alloc => {
        updateAllocationAmount(alloc.id, perStaffBailing.toFixed(2));
      });
    }
  };
  
  // Calculate net profit
  const calculateNetProfit = () => {
    const totalAmount = parseFloat(entry.total_amount) || 0;
    const segregationAmount = parseFloat(entry.segregation_amount) || 0;
    const bailingAmount = parseFloat(entry.bailing_amount) || 0;
    
    return (totalAmount - segregationAmount - bailingAmount).toFixed(2);
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Save the entry
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate form
      if (!entry.buyer_id || !entry.vehicle_number || !entry.segregation_rate_per_kg || !entry.bailing_rate_per_kg) {
        throw new Error('Please fill all required fields');
      }
      
      // Validate items
      if (items.length === 0) {
        throw new Error('Please add at least one material item');
      }
      
      // Validate labor allocations
      const segregationAllocations = laborAllocations.filter(alloc => alloc.labor_type === 'SEGREGATION');
      const bailingAllocations = laborAllocations.filter(alloc => alloc.labor_type === 'BAILING');
      
      const totalSegregationAllocated = segregationAllocations.reduce((sum, alloc) => sum + parseFloat(alloc.amount || 0), 0);
      const totalBailingAllocated = bailingAllocations.reduce((sum, alloc) => sum + parseFloat(alloc.amount || 0), 0);
      
      const segregationAmount = parseFloat(entry.segregation_amount) || 0;
      const bailingAmount = parseFloat(entry.bailing_amount) || 0;
      
      if (Math.abs(totalSegregationAllocated - segregationAmount) > 0.01) {
        throw new Error(`Total segregation labor allocation (${formatCurrency(totalSegregationAllocated)}) must equal the segregation amount (${formatCurrency(segregationAmount)})`);
      }
      
      if (Math.abs(totalBailingAllocated - bailingAmount) > 0.01) {
        throw new Error(`Total bailing labor allocation (${formatCurrency(totalBailingAllocated)}) must equal the bailing amount (${formatCurrency(bailingAmount)})`);
      }
      
      // Generate voucher number if empty
      let voucherNumber = entry.voucher_number.trim();
      if (!voucherNumber) {
        voucherNumber = generateVoucherNumber();
      }
      
      // Get exact values to satisfy CHECK constraints
      const totalQuantity = parseFloat(entry.total_quantity);
      const segregationRatePerKg = parseFloat(entry.segregation_rate_per_kg);
      const bailingRatePerKg = parseFloat(entry.bailing_rate_per_kg);
      
      // Calculate exact values to match CHECK constraints
      const exactSegregationAmount = totalQuantity * segregationRatePerKg;
      const exactBailingAmount = totalQuantity * bailingRatePerKg;
      
      // Prepare data for database
      const entryData = {
        voucher_number: voucherNumber,
        transaction_date: format(entry.transaction_date, 'yyyy-MM-dd'),
        buyer_id: entry.buyer_id,
        vehicle_number: entry.vehicle_number,
        total_quantity: totalQuantity,
        total_amount: parseFloat(entry.total_amount),
        segregation_rate_per_kg: segregationRatePerKg,
        segregation_amount: exactSegregationAmount, // Use exact calculated value
        bailing_rate_per_kg: bailingRatePerKg,
        bailing_amount: exactBailingAmount, // Use exact calculated value
        notes: entry.notes
      };
      
      let savedEntry;
      
      // Update or create entry
      if (entryId) {
        // Update existing entry
        const { data, error } = await supabase
          .from('segregated_waste_outward')
          .update(entryData)
          .eq('id', entryId)
          .select()
          .single();
          
        if (error) throw error;
        savedEntry = data;
        
        // Delete existing items and labor allocations
        await supabase
          .from('segregated_waste_outward_items')
          .delete()
          .eq('outward_id', entryId);
          
        await supabase
          .from('segregated_waste_outward_labor')
          .delete()
          .eq('outward_id', entryId);
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from('segregated_waste_outward')
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
      
      // Save items
      const itemEntries = items.map(item => ({
        outward_id: savedEntry.id,
        material_type: item.material_type,
        quantity: parseFloat(item.quantity),
        rate_per_kg: parseFloat(item.rate_per_kg),
        amount: parseFloat(item.amount)
      }));
      
      const { error: itemsError } = await supabase
        .from('segregated_waste_outward_items')
        .insert(itemEntries);
        
      if (itemsError) throw itemsError;
      
      // Save labor allocations
      if (laborAllocations.length > 0) {
        const laborEntries = laborAllocations.map(alloc => ({
          outward_id: savedEntry.id,
          staff_id: alloc.staff_id,
          labor_type: alloc.labor_type,
          amount: parseFloat(alloc.amount)
        }));
        
        const { error: laborError } = await supabase
          .from('segregated_waste_outward_labor')
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
  
  // Add a debug save function that uses direct API calls
  const handleDebugSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate form
      if (!entry.buyer_id || !entry.vehicle_number || !entry.segregation_rate_per_kg || !entry.bailing_rate_per_kg) {
        throw new Error('Please fill all required fields');
      }
      
      // Validate items
      if (items.length === 0) {
        throw new Error('Please add at least one material item');
      }
      
      // Generate voucher number if empty
      let voucherNumber = entry.voucher_number.trim();
      if (!voucherNumber) {
        voucherNumber = generateVoucherNumber();
      }
      
      // Get exact values
      const totalQuantity = parseFloat(entry.total_quantity);
      const segregationRatePerKg = parseFloat(entry.segregation_rate_per_kg);
      const bailingRatePerKg = parseFloat(entry.bailing_rate_per_kg);
      const exactSegregationAmount = totalQuantity * segregationRatePerKg;
      const exactBailingAmount = totalQuantity * bailingRatePerKg;
      
      console.log('Debug: Using direct SQL execution');
      
      // First, just try a simple insert without RETURNING clause
      const insertQuery = `
        INSERT INTO segregated_waste_outward (
          voucher_number, 
          transaction_date, 
          buyer_id, 
          vehicle_number, 
          total_quantity, 
          total_amount, 
          segregation_rate_per_kg, 
          segregation_amount, 
          bailing_rate_per_kg, 
          bailing_amount, 
          notes
        ) VALUES (
          '${voucherNumber}',
          '${format(entry.transaction_date, 'yyyy-MM-dd')}',
          '${entry.buyer_id}',
          '${entry.vehicle_number}',
          ${totalQuantity},
          ${parseFloat(entry.total_amount)},
          ${segregationRatePerKg},
          ${exactSegregationAmount},
          ${bailingRatePerKg},
          ${exactBailingAmount},
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
        SELECT id FROM segregated_waste_outward 
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
      
      // Insert items one by one
      for (const item of items) {
        const itemInsertQuery = `
          INSERT INTO segregated_waste_outward_items (
            outward_id,
            material_type,
            quantity,
            rate_per_kg,
            amount
          ) VALUES (
            '${newEntryId}',
            '${item.material_type}',
            ${parseFloat(item.quantity)},
            ${parseFloat(item.rate_per_kg)},
            ${parseFloat(item.amount)}
          )`;
        
        const { error: itemError } = await supabase.rpc('execute_sql', { query: itemInsertQuery });
        
        if (itemError) {
          console.error('Debug item insert error:', itemError);
          throw new Error(`Error saving item with direct SQL: ${itemError.message}`);
        }
      }
      
      // Insert labor allocations one by one
      for (const alloc of laborAllocations) {
        const laborInsertQuery = `
          INSERT INTO segregated_waste_outward_labor (
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
            <InputLabel>Buyer</InputLabel>
            <Select
              value={entry.buyer_id}
              onChange={(e) => handleChange('buyer_id', e.target.value)}
              label="Buyer"
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
        
        {/* Material Items */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}>
            <Typography variant="subtitle2">Material Items</Typography>
          </Divider>
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openItemDialog()}
            >
              Add Material Item
            </Button>
          </Box>
          
          {items.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material Type</TableCell>
                    <TableCell align="right">Quantity (kg)</TableCell>
                    <TableCell align="right">Rate/kg</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
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
                      <TableCell align="right">{parseFloat(item.quantity).toLocaleString()}</TableCell>
                      <TableCell align="right">{formatCurrency(item.rate_per_kg)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit Item">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => openItemDialog(item)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove Item">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => deleteItem(item.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell><strong>Total</strong></TableCell>
                    <TableCell align="right"><strong>{parseFloat(entry.total_quantity).toLocaleString()} kg</strong></TableCell>
                    <TableCell align="right"></TableCell>
                    <TableCell align="right"><strong>{formatCurrency(entry.total_amount)}</strong></TableCell>
                    <TableCell align="right"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              No material items added. Please add at least one item.
            </Alert>
          )}
        </Grid>
        
        {/* Labor Rates */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}>
            <Typography variant="subtitle2">Labor Rates</Typography>
          </Divider>
        </Grid>
        
        <Grid item xs={12} sm={3}>
          <TextField
            label="Segregation Rate/kg"
            type="number"
            value={entry.segregation_rate_per_kg}
            onChange={(e) => handleChange('segregation_rate_per_kg', e.target.value)}
            fullWidth
            required
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              inputProps: { min: 0, step: 0.01 }
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={3}>
          <TextField
            label="Segregation Amount"
            type="number"
            value={entry.segregation_amount}
            InputProps={{
              readOnly: true,
              startAdornment: <InputAdornment position="start">₹</InputAdornment>
            }}
            fullWidth
          />
        </Grid>
        
        <Grid item xs={12} sm={3}>
          <TextField
            label="Bailing Rate/kg"
            type="number"
            value={entry.bailing_rate_per_kg}
            onChange={(e) => handleChange('bailing_rate_per_kg', e.target.value)}
            fullWidth
            required
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
        
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
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
        
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" gutterBottom>Segregation Labor</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FormControl fullWidth sx={{ mr: 2 }}>
              <InputLabel>Add Staff for Segregation</InputLabel>
              <Select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addStaffMember(e.target.value, 'SEGREGATION');
                    e.target.value = ""; // Reset select after selection
                  }
                }}
                label="Add Staff for Segregation"
              >
                <MenuItem value="">Select Staff</MenuItem>
                {staffMembers
                  .filter(staff => !laborAllocations.some(
                    alloc => alloc.staff_id === staff.id && alloc.labor_type === 'SEGREGATION'
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
              startIcon={<AddIcon />}
              onClick={() => {
                const select = document.querySelector('[label="Add Staff for Segregation"]');
                if (select) select.focus();
              }}
            >
              Add
            </Button>
          </Box>
          
          {laborAllocations.filter(a => a.labor_type === 'SEGREGATION').length > 0 ? (
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
                    .filter(alloc => alloc.labor_type === 'SEGREGATION')
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
                            .filter(alloc => alloc.labor_type === 'SEGREGATION')
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
              No staff assigned for segregation labor.
            </Alert>
          )}
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
              startIcon={<AddIcon />}
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

  // Item Dialog
  const renderItemDialog = () => (
    <Dialog
      open={itemDialog.open}
      onClose={() => setItemDialog(prev => ({ ...prev, open: false }))}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {itemDialog.isEdit ? 'Edit Material Item' : 'Add Material Item'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Material Type</InputLabel>
              <Select
                value={itemDialog.item.material_type}
                onChange={(e) => handleItemChange('material_type', e.target.value)}
                label="Material Type"
              >
                {materialTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Quantity (kg)"
              type="number"
              value={itemDialog.item.quantity}
              onChange={(e) => handleItemChange('quantity', e.target.value)}
              fullWidth
              required
              InputProps={{
                inputProps: { min: 0, step: 0.01 }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Rate per kg"
              type="number"
              value={itemDialog.item.rate_per_kg}
              onChange={(e) => handleItemChange('rate_per_kg', e.target.value)}
              fullWidth
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Amount"
              type="number"
              value={itemDialog.item.amount}
              InputProps={{
                readOnly: true,
                startAdornment: <InputAdornment position="start">₹</InputAdornment>
              }}
              fullWidth
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => setItemDialog(prev => ({ ...prev, open: false }))}
        >
          Cancel
        </Button>
        <Button 
          onClick={saveItem}
          variant="contained" 
          color="primary"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
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
          {renderItemDialog()}
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
        {entryId ? 'Edit Segregated Waste Outward Entry' : 'New Segregated Waste Outward Entry'}
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
      {renderItemDialog()}
    </Paper>
  );
};

export default SegregatedOutwardEntryForm;