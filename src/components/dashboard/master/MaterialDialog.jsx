import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

function MaterialDialog({
  open,
  onClose,
  onSubmit,
  editingMaterial,
  formData,
  formErrors,
  onInputChange
}) {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: '8px',
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)'
        }
      }}
    >
      <DialogTitle
        sx={{ 
          fontSize: '24px', 
          fontWeight: 500,
          p: 3,
          pb: 2
        }}
      >
        {editingMaterial ? 'Edit Material' : 'Add New Material'}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            color: 'grey.500',
            '&:hover': {
              color: 'grey.700',
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 1 }}>
        <Box sx={{ mb: 3, mt: 1 }}>
          <TextField
            fullWidth
            label="Material Name"
            name="name"
            value={formData.name || ''}
            onChange={onInputChange}
            required
            error={!!formErrors.name}
            helperText={formErrors.name}
            autoFocus
            sx={{ mb: 3 }}
            InputProps={{
              sx: { borderRadius: '6px' }
            }}
          />
          
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description || ''}
            onChange={onInputChange}
            multiline
            rows={4}
            InputProps={{
              sx: { borderRadius: '6px' }
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={onClose}
          sx={{ 
            color: 'grey.700',
            textTransform: 'none',
            fontWeight: 500,
            px: 3
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
            fontWeight: 500,
            px: 4,
            borderRadius: '6px',
            '&:hover': {
              bgcolor: '#43a047'
            }
          }}
        >
          {editingMaterial ? 'Update' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MaterialDialog;