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
  ButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { supabase } from '../../../supabase';

function InventoryOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [alert, setAlert] = useState({ show: false, type: 'info', message: '' });
  const [stats, setStats] = useState({
    totalItems: 0,
    totalWeight: 0, 
    locations: 0,
    materials: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    locationId: '',
    materialType: ''
  });
  const [locations, setLocations] = useState([]);
  const [materials, setMaterials] = useState([]);

  // Fetch inventory, locations, and materials on component mount
  useEffect(() => {
    Promise.all([
      fetchInventory(),
      fetchLocations(),
      fetchMaterials()
    ]);
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, type')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

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
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('inventory')
        .select(`
          *,
          location:location_id(id, name, type),
          material:material_id(id, name, code, description)
        `);
      
      // Apply filters if they exist
      if (filters.locationId) {
        query = query.eq('location_id', filters.locationId);
      }
      
      if (filters.materialType) {
        query = query.eq('material_id', filters.materialType);
      }

      const { data, error } = await query;

      if (error) throw error;

      setInventory(data || []);

      // Calculate stats
      const totalWeight = data?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
      const uniqueLocations = new Set(data?.map(item => item.location_id) || []);
      const uniqueMaterials = new Set(data?.map(item => item.material_id) || []);
      
      setStats({
        totalItems: data?.length || 0,
        totalWeight,
        locations: uniqueLocations.size,
        materials: uniqueMaterials.size
      });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setAlert({
        show: true,
        type: 'error',
        message: 'Failed to load inventory data.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      locationId: '',
      materialType: ''
    });
  };

  // Apply filters and refresh data
  const handleApplyFilters = () => {
    fetchInventory();
  };

  // Filter inventory based on search
  const filteredInventory = inventory.filter(item => 
    (item.material?.name?.toLowerCase().includes(search.toLowerCase()) ||
     item.material?.code?.toLowerCase().includes(search.toLowerCase()) ||
     item.location?.name?.toLowerCase().includes(search.toLowerCase()))
  );

  // Determine status based on quantity
  const getStockStatus = (quantity) => {
    if (quantity <= 0) return { label: 'Out of Stock', color: 'error' };
    if (quantity < 100) return { label: 'Low Stock', color: 'warning' };
    return { label: 'In Stock', color: 'success' };
  };

  // Export inventory data to CSV
  const exportToCSV = () => {
    if (filteredInventory.length === 0) return;
    
    // Create CSV header row
    const header = ['Material', 'Material Code', 'Location', 'Location Type', 'Quantity (kg)', 'Status'];
    
    // Map data to CSV rows
    const rows = filteredInventory.map(item => [
      item.material?.name || 'Unknown Material',
      item.material?.code || '',
      item.location?.name || 'Unknown Location',
      item.location?.type || '',
      item.quantity || '0',
      getStockStatus(item.quantity).label
    ]);
    
    // Combine header and rows
    const csvContent = [header, ...rows].map(row => row.join(',')).join('\n');
    
    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateAdjustment = () => {
    navigate('/dashboard/inventory/adjust');
  };

  const handleViewHistory = () => {
    navigate('/dashboard/inventory/history');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Inventory Management
          </Typography>
          <Box>
            <ButtonGroup>
              <Button 
                variant="outlined" 
                startIcon={<AddCircleOutlineIcon />}
                onClick={handleCreateAdjustment}
              >
                Adjust Stock
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<HistoryIcon />}
                onClick={handleViewHistory}
              >
                View History
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<FileDownloadIcon />}
                onClick={exportToCSV}
                disabled={filteredInventory.length === 0}
              >
                Export
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />}
                onClick={fetchInventory}
              >
                Refresh
              </Button>
            </ButtonGroup>
          </Box>
        </Box>

        {alert.show && (
          <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert({...alert, show: false})}>
            {alert.message}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Items
                </Typography>
                <Typography variant="h4" fontWeight={600}>
                  {stats.totalItems}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unique inventory records
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Weight
                </Typography>
                <Typography variant="h4" fontWeight={600}>
                  {stats.totalWeight.toLocaleString()} kg
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All materials combined
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Locations
                </Typography>
                <Typography variant="h4" fontWeight={600}>
                  {stats.locations}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  With inventory records
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Materials
                </Typography>
                <Typography variant="h4" fontWeight={600}>
                  {stats.materials}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Different types tracked
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filters */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                placeholder="Search by material or location"
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
            <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => setShowFilters(!showFilters)}
                sx={{ mr: 1 }}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              {showFilters && (
                <Button variant="outlined" onClick={handleResetFilters}>
                  Reset Filters
                </Button>
              )}
            </Grid>
            
            {/* Advanced Filter Panel */}
            {showFilters && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={5}>
                      <FormControl size="small" fullWidth>
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
                    <Grid item xs={12} md={5}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Material</InputLabel>
                        <Select
                          value={filters.materialType}
                          onChange={(e) => handleFilterChange('materialType', e.target.value)}
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
                    <Grid item xs={12} md={2}>
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

        {/* Inventory Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Quantity (kg)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInventory.length > 0 ? (
                  filteredInventory.map((item) => {
                    const status = getStockStatus(item.quantity);
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>{item.material?.name || 'Unknown Material'}</TableCell>
                        <TableCell>{item.material?.code || '-'}</TableCell>
                        <TableCell>{item.location?.name || 'Unknown Location'}</TableCell>
                        <TableCell>{item.location?.type || '-'}</TableCell>
                        <TableCell align="right">{Number(item.quantity).toLocaleString() || 0}</TableCell>
                        <TableCell>
                          <Chip 
                            label={status.label} 
                            color={status.color} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(item.updated_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body1" sx={{ py: 3 }}>
                        {search || filters.locationId || filters.materialType 
                          ? 'No matching inventory items found' 
                          : 'No inventory data available'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        {!loading && filteredInventory.length === 0 && !search && !filters.locationId && !filters.materialType && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              No inventory records found. Start by adding your first inventory item.
            </Typography>
            <Button
              variant="contained"
              onClick={handleCreateAdjustment}
              startIcon={<InventoryIcon />}
            >
              Add First Inventory Item
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default InventoryOverview;
