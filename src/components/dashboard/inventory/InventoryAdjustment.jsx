import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { supabase } from '../../../supabase';

// Define adjustment types
const adjustmentTypes = [
  { value: 'COUNT', label: 'Stock Count' },
  { value: 'ADD', label: 'Add Stock' },
  { value: 'REMOVE', label: 'Remove Stock' },
  { value: 'LOSS', label: 'Loss/Damage' }
];

function InventoryAdjustment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [currentInventory, setCurrentInventory] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    location_id: '',
    material_id: '',
    adjustment_type: 'COUNT',
    quantity: '',
    reason: '',
    notes: ''
  });

  // Fetch locations and materials on component mount
  useEffect(() => {
    fetchLocations();
    fetchMaterials();
  }, []);

  // Fetch locations (MRFs and warehouses)
  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, type')
        .in('type', ['MRF', 'GODOWN'])
        .order('name');
      
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load locations',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch materials
  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('id, name, code')
        .order('name');
      
      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load materials',
        severity: 'error'
      });
    }
  };

  // Fetch current inventory for the selected location and material
  useEffect(() => {
    if (formData.location_id && formData.material_id) {
      fetchCurrentInventory();
    } else {
      setCurrentInventory(null);
    }
  }, [formData.location_id, formData.material_id]);

  const fetchCurrentInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('location_id', formData.location_id)
        .eq('material_id', formData.material_id)
        .limit(1);
      
      if (error) throw error;
      setCurrentInventory(data && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch current inventory',
        severity: 'error'
      });
    }
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
    if (!formData.location_id) {
      errors.location_id = 'Location is required';
    }
    if (!formData.material_id) {
      errors.material_id = 'Material is required';
    }
    if (!formData.adjustment_type) {
      errors.adjustment_type = 'Adjustment type is required';
    }
    if (!formData.quantity || isNaN(formData.quantity) || parseFloat(formData.quantity) <= 0) {
      errors.quantity = 'Quantity must be a positive number';
    }
    if (!formData.reason.trim()) {
      errors.reason = 'Reason is required';
    }
    
    // Special validation for REMOVE and LOSS: ensure there's enough inventory
    if ((formData.adjustment_type === 'REMOVE' || formData.adjustment_type === 'LOSS') && 
        currentInventory && 
        parseFloat(formData.quantity) > currentInventory.quantity) {
      errors.quantity = `Not enough inventory. Current quantity: ${currentInventory.quantity}`;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Calculate new quantity based on adjustment type
  const calculateNewQuantity = (currentQty, adjustmentType, adjustmentQty) => {
    const current = parseFloat(currentQty) || 0;
    const adjustment = parseFloat(adjustmentQty) || 0;
    
    switch (adjustmentType) {
      case 'COUNT':
        return adjustment; // Direct replacement
      case 'ADD':
        return current + adjustment;
      case 'REMOVE':
      case 'LOSS':
        return Math.max(0, current - adjustment); // Prevent negative inventory
      default:
        return current;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    try {
      const currentQty = currentInventory ? currentInventory.quantity : 0;
      const newQty = calculateNewQuantity(
        currentQty, 
        formData.adjustment_type, 
        parseFloat(formData.quantity)
      );
      
      // First create an inventory_adjustments record
      const { data: adjustmentData, error: adjustmentError } = await supabase
        .from('inventory_adjustments')
        .insert([{
          location_id: formData.location_id,
          material_id: formData.material_id,
          adjustment_type: formData.adjustment_type,
          quantity: parseFloat(formData.quantity),
          previous_qty: currentQty,
          new_qty: newQty,
          reason: formData.reason,
          notes: formData.notes,
          adjustment_date: new Date().toISOString()
        }])
        .select();
      
      if (adjustmentError) throw adjustmentError;
      
      // Then update the inventory
      if (currentInventory) {
        // Update existing inventory
        const { error: updateError } = await supabase
          .from('inventory')
          .update({
            quantity: newQty,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentInventory.id);
        
        if (updateError) throw updateError;
      } else {
        // Create new inventory record
        const { error: insertError } = await supabase
          .from('inventory')
          .insert([{
            location_id: formData.location_id,
            material_id: formData.material_id,
            quantity: newQty,
            updated_at: new Date().toISOString()
          }]);
        
        if (insertError) throw insertError;
      }
      
      setSnackbar({
        open: true,
        message: 'Inventory adjustment saved successfully',
        severity: 'success'
      });
      
      // Reset form after successful save
      setFormData({
        location_id: '',
        material_id: '',
        adjustment_type: 'COUNT',
        quantity: '',
        reason: '',
        notes: ''
      });
      
      setCurrentInventory(null);
      
    } catch (error) {
      console.error('Error saving inventory adjustment:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save adjustment: ' + error.message,
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };
  
  // Get the current quantity displayed in the form
  const getCurrentQuantityText = () => {
    if (!formData.location_id || !formData.material_id) {
      return 'Select location and material to see current quantity';
    }
    
    if (currentInventory === null) {
      return 'No current inventory record found';
    }
    
    return `Current quantity: ${currentInventory.quantity?.toLocaleString() || 0} kg`;
  };

  // Preview the new quantity after adjustment
  const getNewQuantityPreview = () => {
    if (!formData.quantity || isNaN(formData.quantity) || !formData.adjustment_type || !formData.location_id || !formData.material_id) {
      return null;
    }
    
    const currentQty = currentInventory ? currentInventory.quantity : 0;
    const newQty = calculateNewQuantity(
      currentQty, 
      formData.adjustment_type, 
      parseFloat(formData.quantity)
    );
    
    return `New quantity after adjustment: ${newQty.toLocaleString()} kg`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <IconButton onClick={() => navigate('/dashboard/inventory')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight={600}>
            Inventory Adjustment
          </Typography>
        </Box>
        
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Location Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!formErrors.location_id}>
                <InputLabel>Location</InputLabel>
                <Select
                  name="location_id"
                  value={formData.location_id}
                  onChange={handleInputChange}
                  label="Location"
                  disabled={loading || saving}
                >
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name} ({location.type})
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.location_id && (
                  <FormHelperText>{formErrors.location_id}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            {/* Material Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!formErrors.material_id}>
                <InputLabel>Material</InputLabel>
                <Select
                  name="material_id"
                  value={formData.material_id}
                  onChange={handleInputChange}
                  label="Material"
                  disabled={loading || saving}
                >
                  {materials.map((material) => (
                    <MenuItem key={material.id} value={material.id}>
                      {material.name} ({material.code})
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.material_id && (
                  <FormHelperText>{formErrors.material_id}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            {/* Current Quantity Display */}
            {formData.location_id && formData.material_id && (
              <Grid item xs={12}>
                <Alert severity="info">
                  {getCurrentQuantityText()}
                </Alert>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Divider />
            </Grid>
            
            {/* Adjustment Type */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!formErrors.adjustment_type}>
                <InputLabel>Adjustment Type</InputLabel>
                <Select
                  name="adjustment_type"
                  value={formData.adjustment_type}
                  onChange={handleInputChange}
                  label="Adjustment Type"
                  disabled={saving}
                >
                  {adjustmentTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.adjustment_type && (
                  <FormHelperText>{formErrors.adjustment_type}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            {/* Quantity */}
            <Grid item xs={12} md={6}>
              <TextField
                name="quantity"
                label="Quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                type="number"
                fullWidth
                error={!!formErrors.quantity}
                helperText={formErrors.quantity}
                disabled={saving}
                InputProps={{
                  endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                }}
              />
            </Grid>
            
            {/* Preview new quantity */}
            {getNewQuantityPreview() && (
              <Grid item xs={12}>
                <Typography variant="body2" color="primary" fontWeight={500}>
                  {getNewQuantityPreview()}
                </Typography>
              </Grid>
            )}
            
            {/* Reason */}
            <Grid item xs={12}>
              <TextField
                name="reason"
                label="Reason for Adjustment"
                value={formData.reason}
                onChange={handleInputChange}
                fullWidth
                error={!!formErrors.reason}
                helperText={formErrors.reason || 'Provide a clear reason for this inventory adjustment'}
                disabled={saving}
              />
            </Grid>
            
            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Additional Notes"
                value={formData.notes}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={3}
                disabled={saving}
                helperText="Optional: Include any additional details about this adjustment"
              />
            </Grid>
            
            {/* Submit Button */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/dashboard/inventory')}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {saving ? 'Saving...' : 'Save Adjustment'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
        
        {/* Snackbar for notifications */}
        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={6000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}

export default InventoryAdjustment; 