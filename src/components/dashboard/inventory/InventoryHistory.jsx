import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  TablePagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestoreIcon from '@mui/icons-material/Restore';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format, subDays } from 'date-fns';
import { supabase } from '../../../supabase';

// Helper function to get transaction type label and color
const getTransactionTypeInfo = (type) => {
  switch (type) {
    case 'COUNT':
      return { label: 'Stock Count', color: 'info' };
    case 'ADD':
      return { label: 'Added Stock', color: 'success' };
    case 'REMOVE':
      return { label: 'Removed Stock', color: 'error' };
    case 'LOSS':
      return { label: 'Loss/Damage', color: 'warning' };
    default:
      return { label: type, color: 'default' };
  }
};

function InventoryHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    materialId: '',
    locationId: '',
    startDate: subDays(new Date(), 30), // Last 30 days by default
    endDate: new Date(),
    adjustmentType: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: 'info', message: '' });
  
  // Reference data
  const [materials, setMaterials] = useState([]);
  const [locations, setLocations] = useState([]);

  // Adjustment types
  const adjustmentTypes = [
    { value: 'COUNT', label: 'Stock Count' },
    { value: 'ADD', label: 'Add Stock' },
    { value: 'REMOVE', label: 'Remove Stock' },
    { value: 'LOSS', label: 'Loss/Damage' }
  ];

  useEffect(() => {
    fetchReferenceLists();
  }, []);

  useEffect(() => {
    fetchInventoryHistory();
  }, [page, rowsPerPage]);

  const fetchReferenceLists = async () => {
    try {
      // Fetch materials
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('id, name, code')
        .order('name');
      
      if (materialsError) throw materialsError;
      setMaterials(materialsData || []);
      
      // Fetch locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('id, name, type')
        .in('type', ['MRF', 'GODOWN'])
        .order('name');
      
      if (locationsError) throw locationsError;
      setLocations(locationsData || []);
      
    } catch (error) {
      console.error('Error fetching reference data:', error);
      setAlert({
        show: true,
        type: 'error',
        message: 'Failed to load reference data'
      });
    }
  };
  
  const fetchInventoryHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('inventory_adjustments')
        .select(`
          id,
          adjustment_type,
          quantity,
          previous_qty,
          new_qty,
          reason,
          notes,
          adjustment_date,
          created_at,
          location:location_id(id, name, type),
          material:material_id(id, name, code)
        `, { count: 'exact' });
      
      // Apply filters
      if (filters.materialId) {
        query = query.eq('material_id', filters.materialId);
      }
      
      if (filters.locationId) {
        query = query.eq('location_id', filters.locationId);
      }
      
      if (filters.adjustmentType) {
        query = query.eq('adjustment_type', filters.adjustmentType);
      }
      
      if (filters.startDate) {
        query = query.gte('adjustment_date', format(filters.startDate, 'yyyy-MM-dd'));
      }
      
      if (filters.endDate) {
        // Add one day to include the end date fully
        const nextDay = new Date(filters.endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.lt('adjustment_date', format(nextDay, 'yyyy-MM-dd'));
      }
      
      // Apply pagination
      const from = page * rowsPerPage;
      const to = from + rowsPerPage - 1;
      query = query.order('adjustment_date', { ascending: false }).range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setHistory(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching inventory history:', error);
      setAlert({
        show: true,
        type: 'error',
        message: 'Failed to load inventory history'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle applying filters
  const handleApplyFilters = () => {
    setPage(0); // Reset to first page
    fetchInventoryHistory();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      materialId: '',
      locationId: '',
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
      adjustmentType: ''
    });
    setSearch('');
    setPage(0);
  };

  // Filter history based on search term
  const filteredHistory = history.filter(item => 
    search ? (
      (item.material?.name?.toLowerCase().includes(search.toLowerCase())) ||
      (item.material?.code?.toLowerCase().includes(search.toLowerCase())) ||
      (item.location?.name?.toLowerCase().includes(search.toLowerCase())) ||
      (item.reason?.toLowerCase().includes(search.toLowerCase())) ||
      (item.notes?.toLowerCase().includes(search.toLowerCase()))
    ) : true
  );

  // Export history data to CSV
  const exportToCSV = () => {
    if (filteredHistory.length === 0) return;
    
    // Create CSV header row
    const header = [
      'Date', 'Material', 'Code', 'Location', 
      'Adjustment Type', 'Previous Qty', 'Change', 
      'New Qty', 'Reason', 'Notes'
    ];
    
    // Map data to CSV rows
    const rows = filteredHistory.map(item => [
      new Date(item.adjustment_date).toLocaleDateString(),
      item.material?.name || 'Unknown',
      item.material?.code || '',
      item.location?.name || 'Unknown',
      getTransactionTypeInfo(item.adjustment_type).label,
      item.previous_qty,
      formatQuantityChange(item.adjustment_type, item.quantity),
      item.new_qty,
      item.reason || '',
      item.notes || ''
    ]);
    
    // Combine header and rows
    const csvContent = [header, ...rows].map(row => 
      row.map(cell => `"${cell?.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format change quantity with appropriate sign
  const formatQuantityChange = (type, quantity) => {
    if (type === 'COUNT') {
      return `= ${quantity}`;
    } else if (type === 'ADD') {
      return `+ ${quantity}`;
    } else {
      return `- ${quantity}`;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={() => navigate('/dashboard/inventory')} sx={{ mr: 1 }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h5" fontWeight={600}>
                Inventory History
              </Typography>
            </Box>
            <Button 
              variant="outlined" 
              startIcon={<FileDownloadIcon />}
              onClick={exportToCSV}
              disabled={filteredHistory.length === 0}
            >
              Export
            </Button>
          </Box>
          
          {alert.show && (
            <Alert 
              severity={alert.type} 
              sx={{ mb: 3 }} 
              onClose={() => setAlert(prev => ({ ...prev, show: false }))}
            >
              {alert.message}
            </Alert>
          )}

          {/* Search and Filters */}
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  placeholder="Search inventory history"
                  variant="outlined"
                  fullWidth
                  size="small"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={() => setShowFilters(!showFilters)}
                  sx={{ mr: 1 }}
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RestoreIcon />}
                  onClick={resetFilters}
                >
                  Reset
                </Button>
              </Grid>
              
              {/* Advanced Filters */}
              {showFilters && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Material</InputLabel>
                          <Select
                            value={filters.materialId}
                            onChange={(e) => handleFilterChange('materialId', e.target.value)}
                            label="Material"
                          >
                            <MenuItem value="">All Materials</MenuItem>
                            {materials.map((material) => (
                              <MenuItem key={material.id} value={material.id}>
                                {material.name} ({material.code})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Location</InputLabel>
                          <Select
                            value={filters.locationId}
                            onChange={(e) => handleFilterChange('locationId', e.target.value)}
                            label="Location"
                          >
                            <MenuItem value="">All Locations</MenuItem>
                            {locations.map((location) => (
                              <MenuItem key={location.id} value={location.id}>
                                {location.name} ({location.type})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Adjustment Type</InputLabel>
                          <Select
                            value={filters.adjustmentType}
                            onChange={(e) => handleFilterChange('adjustmentType', e.target.value)}
                            label="Adjustment Type"
                          >
                            <MenuItem value="">All Types</MenuItem>
                            {adjustmentTypes.map((type) => (
                              <MenuItem key={type.value} value={type.value}>
                                {type.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <DatePicker
                          label="Start Date"
                          value={filters.startDate}
                          onChange={(date) => handleFilterChange('startDate', date)}
                          slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <DatePicker
                          label="End Date"
                          value={filters.endDate}
                          onChange={(date) => handleFilterChange('endDate', date)}
                          slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <Button 
                          variant="contained" 
                          fullWidth 
                          onClick={handleApplyFilters}
                        >
                          Apply Filters
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Inventory History Table */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Material</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Previous Qty</TableCell>
                      <TableCell align="right">Change</TableCell>
                      <TableCell align="right">New Qty</TableCell>
                      <TableCell>Reason</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredHistory.length > 0 ? (
                      filteredHistory.map((item) => {
                        const transactionType = getTransactionTypeInfo(item.adjustment_type);
                        return (
                          <TableRow key={item.id} hover>
                            <TableCell>
                              {new Date(item.adjustment_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{item.material?.name || 'Unknown'}</Typography>
                              <Typography variant="caption" color="text.secondary">{item.material?.code}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{item.location?.name || 'Unknown'}</Typography>
                              <Typography variant="caption" color="text.secondary">{item.location?.type}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={transactionType.label} 
                                color={transactionType.color} 
                                size="small" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">
                              {item.previous_qty?.toLocaleString()} kg
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ 
                                color: 
                                  item.adjustment_type === 'REMOVE' || item.adjustment_type === 'LOSS' 
                                    ? 'error.main' 
                                    : item.adjustment_type === 'ADD' 
                                      ? 'success.main' 
                                      : 'info.main',
                                fontWeight: 'medium'
                              }}>
                                {formatQuantityChange(item.adjustment_type, item.quantity.toLocaleString())} kg
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              {item.new_qty?.toLocaleString()} kg
                            </TableCell>
                            <TableCell>
                              <Tooltip title={item.notes || ''}>
                                <span>{item.reason}</span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body1" sx={{ py: 3 }}>
                            No inventory history found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </>
          )}
        </Paper>
      </Box>
    </LocalizationProvider>
  );
}

export default InventoryHistory; 