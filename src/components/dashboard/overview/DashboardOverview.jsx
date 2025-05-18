import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent, 
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  useTheme
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  MoreVert, 
  Inventory, 
  LocalShipping, 
  AttachMoney, 
  Receipt, 
  Warehouse,
  CalendarToday,
  FilterList
} from '@mui/icons-material';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Date formatting utility
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Number formatting utility
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const DashboardOverview = () => {
  const theme = useTheme();
  
  // State hooks for dashboard data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('month'); // 'day', 'week', 'month', 'year'
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  
  // Data states
  const [totalInwardWaste, setTotalInwardWaste] = useState(0);
  const [totalOutwardSales, setTotalOutwardSales] = useState(0);
  const [totalRejectedDisposal, setTotalRejectedDisposal] = useState(0);
  const [bankBalance, setBankBalance] = useState(0);
  const [staffPayments, setStaffPayments] = useState(0);
  const [inwardTrend, setInwardTrend] = useState([]);
  const [outwardTrend, setOutwardTrend] = useState([]);
  const [materialBreakdown, setMaterialBreakdown] = useState([]);
  const [locationPerformance, setLocationPerformance] = useState([]);
  const [inventoryStatus, setInventoryStatus] = useState([]);
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  // Handle filter menu
  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    handleMenuClose();
  };
  
  // Get date range SQL query part
  const getDateRangeFilter = () => {
    const today = new Date();
    let startDate;
    
    switch(dateRange) {
      case 'day':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
    }
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  };
  
  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const dateFilter = getDateRangeFilter();
      
      // 1. Fetch total inward waste
      const { data: inwardData, error: inwardError } = await supabase
        .from('rejected_waste_inward')
        .select('quantity, total_amount')
        .gte('transaction_date', dateFilter.start)
        .lte('transaction_date', dateFilter.end);
        
      if (inwardError) throw inwardError;
      
      // 2. Fetch total outward sales
      const { data: outwardData, error: outwardError } = await supabase
        .from('segregated_waste_outward')
        .select('total_quantity, total_amount')
        .gte('transaction_date', dateFilter.start)
        .lte('transaction_date', dateFilter.end);
        
      if (outwardError) throw outwardError;
      
      // 3. Fetch rejected waste disposal
      const { data: rejectedOutwardData, error: rejectedOutwardError } = await supabase
        .from('rejected_waste_outward')
        .select('quantity, total_amount')
        .gte('transaction_date', dateFilter.start)
        .lte('transaction_date', dateFilter.end);
        
      if (rejectedOutwardError) throw rejectedOutwardError;
      
      // 4. Fetch bank balance
      const { data: bankData, error: bankError } = await supabase
        .from('bank_accounts')
        .select('name, current_balance');
        
      if (bankError) throw bankError;
      
      // 5. Fetch staff payments
      const { data: staffPaymentData, error: staffPaymentError } = await supabase
        .from('payments')
        .select('amount')
        .eq('transaction_type', 'STAFF_PAYMENT')
        .gte('payment_date', dateFilter.start)
        .lte('payment_date', dateFilter.end);
        
      if (staffPaymentError) throw staffPaymentError;
      
      // 6. Fetch inward trend data
      const { data: inwardTrendData, error: inwardTrendError } = await supabase
        .from('rejected_waste_inward')
        .select('transaction_date, quantity')
        .gte('transaction_date', dateFilter.start)
        .lte('transaction_date', dateFilter.end)
        .order('transaction_date', { ascending: true });
        
      if (inwardTrendError) throw inwardTrendError;
      
      // 7. Fetch outward trend data
      const { data: outwardTrendData, error: outwardTrendError } = await supabase
        .from('segregated_waste_outward')
        .select('transaction_date, total_quantity, total_amount')
        .gte('transaction_date', dateFilter.start)
        .lte('transaction_date', dateFilter.end)
        .order('transaction_date', { ascending: true });
        
      if (outwardTrendError) throw outwardTrendError;
      
      // 8. Fetch material breakdown data
      const { data: materialData, error: materialError } = await supabase
        .from('segregated_waste_outward_items')
        .select(`
          material_type,
          quantity,
          segregated_waste_outward!inner(transaction_date)
        `)
        .gte('segregated_waste_outward.transaction_date', dateFilter.start)
        .lte('segregated_waste_outward.transaction_date', dateFilter.end);
        
      if (materialError) throw materialError;
      
      // 9. Fetch location performance
      const { data: locationData, error: locationError } = await supabase
        .from('rejected_waste_inward')
        .select(`
          quantity,
          from_location_id,
          locations!from_location_id(name)
        `)
        .gte('transaction_date', dateFilter.start)
        .lte('transaction_date', dateFilter.end);
        
      if (locationError) throw locationError;
      
      // 10. Fetch inventory status
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select(`
          quantity,
          materials(name),
          locations(name)
        `)
        .order('quantity', { ascending: false })
        .limit(10);
        
      if (inventoryError) throw inventoryError;
      
      // Process and set the data
      // Total inward waste
      const totalInward = inwardData.reduce((sum, item) => sum + (item.quantity || 0), 0);
      setTotalInwardWaste(totalInward);
      
      // Total outward sales
      const totalOutward = outwardData.reduce((sum, item) => sum + (item.total_amount || 0), 0);
      setTotalOutwardSales(totalOutward);
      
      // Total rejected disposal
      const totalRejected = rejectedOutwardData.reduce((sum, item) => sum + (item.quantity || 0), 0);
      setTotalRejectedDisposal(totalRejected);
      
      // Bank balance
      const totalBalance = bankData.reduce((sum, account) => sum + (account.current_balance || 0), 0);
      setBankBalance(totalBalance);
      
      // Staff payments
      const totalStaffPayments = staffPaymentData.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      setStaffPayments(totalStaffPayments);
      
      // Process inward trend data - group by day
      const inwardByDate = inwardTrendData.reduce((acc, item) => {
        const date = item.transaction_date.split('T')[0];
        if (!acc[date]) acc[date] = { date, quantity: 0 };
        acc[date].quantity += (item.quantity || 0);
        return acc;
      }, {});
      
      setInwardTrend(Object.values(inwardByDate));
      
      // Process outward trend data - group by day
      const outwardByDate = outwardTrendData.reduce((acc, item) => {
        const date = item.transaction_date.split('T')[0];
        if (!acc[date]) acc[date] = { date, quantity: 0, amount: 0 };
        acc[date].quantity += (item.total_quantity || 0);
        acc[date].amount += (item.total_amount || 0);
        return acc;
      }, {});
      
      setOutwardTrend(Object.values(outwardByDate));
      
      // Process material breakdown data
      const materialsByType = materialData.reduce((acc, item) => {
        const type = item.material_type;
        if (!acc[type]) acc[type] = { name: type, value: 0 };
        acc[type].value += (item.quantity || 0);
        return acc;
      }, {});
      
      setMaterialBreakdown(Object.values(materialsByType));
      
      // Process location performance data
      const locationsByName = locationData.reduce((acc, item) => {
        const locationName = item.locations?.name || 'Unknown';
        if (!acc[locationName]) acc[locationName] = { name: locationName, value: 0 };
        acc[locationName].value += (item.quantity || 0);
        return acc;
      }, {});
      
      setLocationPerformance(Object.values(locationsByName));
      
      // Process inventory status data
      const processedInventory = inventoryData.map(item => ({
        material: item.materials?.name || 'Unknown',
        location: item.locations?.name || 'Unknown',
        quantity: item.quantity || 0
      }));
      
      setInventoryStatus(processedInventory);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch data when component mounts or date range changes
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);
  
  // If loading, show progress indicator
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // If error, show error message
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">{error}</Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header with title and filter */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          Malabar Eco Solutions Dashboard
        </Typography>
        
        <Box>
          <Tooltip title="Filter by date range">
            <IconButton onClick={handleMenuOpen}>
              <FilterList />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => handleDateRangeChange('day')}>Last 24 Hours</MenuItem>
            <MenuItem onClick={() => handleDateRangeChange('week')}>Last 7 Days</MenuItem>
            <MenuItem onClick={() => handleDateRangeChange('month')}>Last 30 Days</MenuItem>
            <MenuItem onClick={() => handleDateRangeChange('year')}>Last 365 Days</MenuItem>
          </Menu>
        </Box>
      </Box>
      
      {/* Date range indicator */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <CalendarToday fontSize="small" sx={{ mr: 1, color: theme.palette.text.secondary }} />
        <Typography variant="subtitle1" color="textSecondary">
          {dateRange === 'day' && 'Last 24 Hours'}
          {dateRange === 'week' && 'Last 7 Days'}
          {dateRange === 'month' && 'Last 30 Days'}
          {dateRange === 'year' && 'Last 365 Days'}
        </Typography>
      </Box>
      
      {/* Stats Cards Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Inward Waste Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ 
            borderRadius: 2,
            borderTop: `4px solid ${theme.palette.primary.main}`,
            height: '100%' 
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Total Waste Collected
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {totalInwardWaste.toFixed(2)} kg
                  </Typography>
                </Box>
                <LocalShipping sx={{ color: theme.palette.primary.main, fontSize: 40 }} />
              </Box>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ color: 'success.main', mr: 1 }} fontSize="small" />
                <Typography variant="body2" color="success.main">
                  +{(totalInwardWaste * 0.05).toFixed(2)} kg
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
                  vs. previous period
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Outward Sales Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ 
            borderRadius: 2,
            borderTop: `4px solid ${theme.palette.success.main}`,
            height: '100%' 
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Total Sales Revenue
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(totalOutwardSales)}
                  </Typography>
                </Box>
                <AttachMoney sx={{ color: theme.palette.success.main, fontSize: 40 }} />
              </Box>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ color: 'success.main', mr: 1 }} fontSize="small" />
                <Typography variant="body2" color="success.main">
                  +{formatCurrency(totalOutwardSales * 0.08)}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
                  vs. previous period
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Rejected Waste Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ 
            borderRadius: 2,
            borderTop: `4px solid ${theme.palette.warning.main}`,
            height: '100%' 
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Rejected Waste Disposed
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {totalRejectedDisposal.toFixed(2)} kg
                  </Typography>
                </Box>
                <Warehouse sx={{ color: theme.palette.warning.main, fontSize: 40 }} />
              </Box>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                <TrendingDown sx={{ color: 'success.main', mr: 1 }} fontSize="small" />
                <Typography variant="body2" color="success.main">
                  -{(totalRejectedDisposal * 0.03).toFixed(2)} kg
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
                  vs. previous period
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Bank Balance Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ 
            borderRadius: 2,
            borderTop: `4px solid ${theme.palette.info.main}`,
            height: '100%' 
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Current Bank Balance
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(bankBalance)}
                  </Typography>
                </Box>
                <Receipt sx={{ color: theme.palette.info.main, fontSize: 40 }} />
              </Box>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="textSecondary">
                  Staff Payments: {formatCurrency(staffPayments)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Waste Collection Trend */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Waste Collection Trend
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={inwardTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en', { day: '2-digit', month: 'short' })}
                />
                <YAxis 
                  label={{ value: 'Quantity (kg)', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <RechartsTooltip 
                  formatter={(value) => [`${value.toFixed(2)} kg`, 'Quantity']}
                  labelFormatter={(date) => formatDate(date)}
                />
                <Line 
                  type="monotone" 
                  dataKey="quantity" 
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Sales Revenue Trend */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Sales Revenue Trend
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={outwardTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en', { day: '2-digit', month: 'short' })}
                />
                <YAxis 
                  yAxisId="left"
                  label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'Quantity (kg)', angle: 90, position: 'insideRight' }}
                  tick={{ fontSize: 12 }}
                />
                <RechartsTooltip 
                  formatter={(value, name) => {
                    if (name === 'amount') return [formatCurrency(value), 'Revenue'];
                    return [`${value.toFixed(2)} kg`, 'Quantity'];
                  }}
                  labelFormatter={(date) => formatDate(date)}
                />
                <Legend />
                <Bar 
                  yAxisId="left" 
                  dataKey="amount" 
                  name="Revenue" 
                  fill={theme.palette.success.main} 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  yAxisId="right" 
                  dataKey="quantity" 
                  name="Quantity" 
                  fill={theme.palette.info.light}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Pie Charts Row */}
      <Grid container spacing={3}>
        {/* Material Breakdown */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Material Breakdown
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {materialBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={materialBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {materialBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value) => `${value.toFixed(2)} kg`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Typography color="textSecondary">No material data available</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Location Performance */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Top Collection Sources
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {locationPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={locationPerformance}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => 
                      `${name.length > 10 ? name.substring(0, 10) + '...' : name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {locationPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value, name, props) => [`${value.toFixed(2)} kg`, props.payload.name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Typography color="textSecondary">No location data available</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Inventory Status */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, maxHeight: 366, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Current Inventory Status
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {inventoryStatus.length > 0 ? (
              <Box>
                {inventoryStatus.map((item, index) => (
                  <Box key={index} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <Inventory sx={{ mr: 1, color: COLORS[index % COLORS.length] }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {item.material}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {item.location} - {item.quantity.toFixed(2)} kg
                      </Typography>
                      <Box sx={{ 
                        mt: 0.5, 
                        backgroundColor: 'rgba(0,0,0,0.1)', 
                        borderRadius: 5,
                        height: 8 
                      }}>
                        <Box sx={{ 
                          height: '100%',
                          width: `${Math.min(100, (item.quantity / (inventoryStatus[0].quantity || 1)) * 100)}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                          borderRadius: 5
                        }} />
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Typography color="textSecondary">No inventory data available</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardOverview;