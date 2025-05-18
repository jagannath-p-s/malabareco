import {
  Dialog,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

function LocationDialog({
  open,
  onClose,
  onSubmit,
  editingLocation,
  formData,
  formErrors,
  onInputChange
}) {
  const locationTypes = [
    { value: 'LSGI', label: 'Local Self Government Institution' },
    { value: 'MRF', label: 'Material Recovery Facility' },
    { value: 'BUYER', label: 'Buyer/Recycling Company' },
    { value: 'DISPOSAL', label: 'Disposal Facility' }
  ];

  const districts = [
    'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 
    'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 
    'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'
  ];

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: '4px',
          overflow: 'hidden'
        }
      }}
    >
      <Box sx={{ p: 3, pt: 2, pb: 0, position: 'relative' }}>
        <Typography 
          variant="h6" 
          component="h2" 
          sx={{ 
            fontSize: '20px', 
            fontWeight: 400,
            mb: 3
          }}
        >
          {editingLocation ? 'Edit Location' : 'Add New Location'}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 16,
            top: 8,
            color: 'grey.500',
          }}
        >
          <CloseIcon />
        </IconButton>
        
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 2,
          mb: 4
        }}>
          <Box>
            <Typography 
              component="label" 
              htmlFor="location-name" 
              sx={{ 
                display: 'block', 
                mb: 0.5, 
                fontSize: '14px' 
              }}
            >
              Location Name *
            </Typography>
            <input
              id="location-name"
              name="name"
              value={formData.name || ''}
              onChange={onInputChange}
              placeholder="Location Name"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '16px',
                border: formErrors.name ? '1px solid #d32f2f' : '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
            {formErrors.name && (
              <Typography color="error" variant="caption">
                {formErrors.name}
              </Typography>
            )}
          </Box>

          <Box>
            <Typography 
              component="label" 
              htmlFor="location-type" 
              sx={{ 
                display: 'block', 
                mb: 0.5, 
                fontSize: '14px' 
              }}
            >
              Location Type *
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                id="location-type"
                name="type"
                value={formData.type || 'LSGI'}
                onChange={onInputChange}
                error={!!formErrors.type}
                sx={{
                  fontSize: '16px',
                  '& .MuiSelect-select': {
                    padding: '8px 12px',
                  }
                }}
              >
                {locationTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {formErrors.type && (
              <Typography color="error" variant="caption">
                {formErrors.type}
              </Typography>
            )}
          </Box>

          <Box>
            <Typography 
              component="label" 
              htmlFor="district" 
              sx={{ 
                display: 'block', 
                mb: 0.5, 
                fontSize: '14px' 
              }}
            >
              District
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                id="district"
                name="district"
                value={formData.district || ''}
                onChange={onInputChange}
                sx={{
                  fontSize: '16px',
                  '& .MuiSelect-select': {
                    padding: '8px 12px',
                  }
                }}
              >
                <MenuItem value="">
                  <em>Select District</em>
                </MenuItem>
                {districts.map(district => (
                  <MenuItem key={district} value={district}>
                    {district}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Typography 
              component="label" 
              htmlFor="address" 
              sx={{ 
                display: 'block', 
                mb: 0.5, 
                fontSize: '14px' 
              }}
            >
              Address
            </Typography>
            <textarea
              id="address"
              name="address"
              value={formData.address || ''}
              onChange={onInputChange}
              placeholder="Enter address"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
                minHeight: '80px',
                resize: 'vertical'
              }}
            />
          </Box>
          
          <Box>
            <Typography 
              component="label" 
              htmlFor="contact-person" 
              sx={{ 
                display: 'block', 
                mb: 0.5, 
                fontSize: '14px' 
              }}
            >
              Contact Person
            </Typography>
            <input
              id="contact-person"
              name="contact_person"
              value={formData.contact_person || ''}
              onChange={onInputChange}
              placeholder="Contact Person"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </Box>
          
          <Box>
            <Typography 
              component="label" 
              htmlFor="contact-number" 
              sx={{ 
                display: 'block', 
                mb: 0.5, 
                fontSize: '14px' 
              }}
            >
              Contact Number
            </Typography>
            <input
              id="contact-number"
              name="contact_number"
              value={formData.contact_number || ''}
              onChange={onInputChange}
              placeholder="Contact Number"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </Box>
        </Box>
      </Box>

      <DialogActions sx={{ 
        px: 3, 
        py: 2,
        justifyContent: 'flex-end',
        gap: 1
      }}>
        <Button 
          onClick={onClose}
          sx={{ 
            color: '#555',
            textTransform: 'none',
            fontWeight: 400,
            fontSize: '16px'
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          sx={{
            bgcolor: '#4caf50',
            color: 'white',
            textTransform: 'none',
            fontWeight: 400,
            fontSize: '16px',
            px: 3,
            py: 0.75,
            borderRadius: '4px',
            '&:hover': {
              bgcolor: '#43a047'
            }
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LocationDialog;