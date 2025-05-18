import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Snackbar,
  InputBase,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { supabase } from '../../../supabase';
import LocationDialog from './LocationDialog';

function LocationsList() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'LSGI',
    district: '',
    address: '',
    contact_person: '',
    contact_number: ''
  });

  // Fetch locations on component mount
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, type, district, address, contact_person, contact_number, created_at, updated_at')
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

  const handleOpenDialog = (location = null) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name || '',
        type: location.type || 'LSGI',
        district: location.district || '',
        address: location.address || '',
        contact_person: location.contact_person || '',
        contact_number: location.contact_number || ''
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        type: 'LSGI',
        district: '',
        address: '',
        contact_person: '',
        contact_number: ''
      });
    }
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
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
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.type) {
      errors.type = 'Type is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const dataToSave = {
        name: formData.name.trim(),
        type: formData.type,
        district: formData.district?.trim() || null,
        address: formData.address?.trim() || null,
        contact_person: formData.contact_person?.trim() || null,
        contact_number: formData.contact_number?.trim() || null,
        updated_at: new Date().toISOString()
      };

      console.log('Saving location data:', dataToSave);

      if (editingLocation) {
        // Update existing location
        const { data, error } = await supabase
          .from('locations')
          .update(dataToSave)
          .eq('id', editingLocation.id)
          .select();

        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }

        console.log('Update response:', data);
        
        setSnackbar({
          open: true,
          message: 'Location updated successfully',
          severity: 'success'
        });
      } else {
        // Create new location
        const { data, error } = await supabase
          .from('locations')
          .insert([dataToSave])
          .select();

        if (error) {
          console.error('Supabase insert error:', error);
          throw error;
        }

        console.log('Insert response:', data);
        
        setSnackbar({
          open: true,
          message: 'Location added successfully',
          severity: 'success'
        });
      }

      handleCloseDialog();
      fetchLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      let errorMessage = 'Failed to save location';
      
      if (error.code) {
        switch (error.code) {
          case '23505': // Unique violation
            errorMessage = 'A location with this name already exists';
            break;
          case '23502': // Not null violation
            errorMessage = 'Please fill in all required fields';
            break;
          case '23503': // Foreign key violation
            errorMessage = 'Referenced record does not exist';
            break;
          default:
            errorMessage = `Error: ${error.message || error.details || 'Unknown error occurred'}`;
        }
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  const handleDeleteClick = (location) => {
    setLocationToDelete(location);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationToDelete.id);

      if (error) throw error;
      
      setSnackbar({
        open: true,
        message: 'Location deleted successfully',
        severity: 'success'
      });
      
      fetchLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      setSnackbar({
        open: true,
        message: error.message === 'violates foreign key constraint' 
          ? 'Cannot delete this location because it is used in transactions'
          : `Failed to delete location: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setDeleteConfirmOpen(false);
      setLocationToDelete(null);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Filter locations based on search query
  const filteredLocations = locations.filter(location => 
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (location.address && location.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (location.contact_person && location.contact_person.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>
            Locations Management
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Location
          </Button>
        </Box>

        {/* Search Box */}
        <Paper
          component="form"
          sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: 400, mb: 3 }}
        >
          <IconButton sx={{ p: '10px' }} aria-label="search">
            <SearchIcon />
          </IconButton>
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="Search locations"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>District</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Contact Person</TableCell>
                  <TableCell>Contact Number</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLocations.length > 0 ? (
                  filteredLocations.map((location) => (
                    <TableRow key={location.id} hover>
                      <TableCell>{location.name}</TableCell>
                      <TableCell>{location.type}</TableCell>
                      <TableCell>{location.district || '-'}</TableCell>
                      <TableCell>{location.address || '-'}</TableCell>
                      <TableCell>{location.contact_person || '-'}</TableCell>
                      <TableCell>{location.contact_number || '-'}</TableCell>
                      <TableCell align="right">
                        <IconButton onClick={() => handleOpenDialog(location)} color="primary" size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteClick(location)} color="error" size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body1" sx={{ py: 3 }}>
                        {searchQuery ? 'No locations found matching your search.' : 'No locations found. Add your first location.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Location Dialog */}
      <LocationDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
        editingLocation={editingLocation}
        formData={formData}
        formErrors={formErrors}
        onInputChange={handleInputChange}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the location "{locationToDelete?.name}"? This action cannot be undone.
          </Typography>
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            Note: If this location is used in any transactions, the deletion will fail.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default LocationsList; 