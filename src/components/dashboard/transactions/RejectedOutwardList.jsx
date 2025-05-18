import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  LinearProgress,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  useMediaQuery,
  TextField,
  InputAdornment,
  Tooltip,
  Menu,
  MenuItem,
  Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import { format, parseISO } from 'date-fns';
import RejectedOutwardEntryForm from './RejectedOutwardEntryForm';

const RejectedOutwardList = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog control
  const [openDialog, setOpenDialog] = useState(false);
  const [editEntryId, setEditEntryId] = useState(null);
  
  // Menu controls
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  // Location data for resolving names
  const [locations, setLocations] = useState([]);
  
  useEffect(() => {
    fetchEntries();
    fetchLocations();
  }, []);
  
  const fetchEntries = async () => {
    setLoading(true);
    try {
      // Get entries with most recent first
      const { data, error } = await supabase
        .from('rejected_waste_outward')
        .select('*')
        .order('transaction_date', { ascending: false });
        
      if (error) throw error;
      
      setEntries(data || []);
    } catch (err) {
      console.error('Error fetching rejected waste outward entries:', err);
      setError('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name');
        
      if (error) throw error;
      
      setLocations(data || []);
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };
  
  const getLocationName = (id) => {
    const location = locations.find(loc => loc.id === id);
    return location ? location.name : 'Unknown Location';
  };
  
  const handleCreateNew = () => {
    setEditEntryId(null);
    setOpenDialog(true);
  };
  
  const handleEdit = (id) => {
    setEditEntryId(id);
    setOpenDialog(true);
    setActionMenuAnchor(null);
  };
  
  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditEntryId(null);
  };
  
  const handleSave = () => {
    fetchEntries();
    setOpenDialog(false);
  };
  
  // Action menu handlers
  const handleActionMenuOpen = (event, id) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedEntryId(id);
  };
  
  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedEntryId(null);
  };
  
  // Search handler
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  // Filter entries based on search query
  const filteredEntries = entries.filter(entry => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const locationName = getLocationName(entry.recipient_id).toLowerCase();
    
    return (
      entry.voucher_number.toLowerCase().includes(searchLower) ||
      entry.vehicle_number.toLowerCase().includes(searchLower) ||
      locationName.includes(searchLower) ||
      (entry.notes && entry.notes.toLowerCase().includes(searchLower))
    );
  });
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Rejected Waste Outward Entries</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
        >
          New Entry
        </Button>
      </Box>
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Search by voucher, vehicle number, or buyer..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />
        </Grid>
        <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Box>
            <Tooltip title="Filter">
              <IconButton>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print">
              <IconButton>
                <PrintIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export">
              <IconButton>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Grid>
      </Grid>
      
      {loading ? (
        <LinearProgress />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Voucher Number</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Recipient</TableCell>
                <TableCell>Vehicle Number</TableCell>
                <TableCell align="right">Quantity (kg)</TableCell>
                <TableCell align="right">Rate/kg</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Type</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.voucher_number}</TableCell>
                    <TableCell>{format(parseISO(entry.transaction_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{getLocationName(entry.recipient_id)}</TableCell>
                    <TableCell>{entry.vehicle_number}</TableCell>
                    <TableCell align="right">{Number(entry.quantity).toLocaleString()}</TableCell>
                    <TableCell align="right">{formatCurrency(entry.rate_per_kg)}</TableCell>
                    <TableCell align="right">{formatCurrency(entry.total_amount)}</TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={entry.is_expense ? "Expense" : "Revenue"} 
                        color={entry.is_expense ? "warning" : "success"} 
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleEdit(entry.id)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={(e) => handleActionMenuOpen(e, entry.id)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    {searchQuery ? 'No matching entries found' : 'No entries found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Entry Form Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          {editEntryId ? 'Edit Rejected Waste Outward Entry' : 'New Rejected Waste Outward Entry'}
          <IconButton
            aria-label="close"
            onClick={handleDialogClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <RejectedOutwardEntryForm
          entryId={editEntryId}
          onSave={handleSave}
          onCancel={handleDialogClose}
          isDialog={true}
        />
      </Dialog>
      
      {/* Actions Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={() => handleEdit(selectedEntryId)}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem>
          <PrintIcon fontSize="small" sx={{ mr: 1 }} />
          Print
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default RejectedOutwardList; 