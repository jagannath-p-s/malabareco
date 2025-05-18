import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  MenuItem,
  IconButton,
  useTheme,
  alpha,
  CircularProgress,
  Divider,
  Alert,
  Tabs,
  Tab,
  ButtonGroup
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import PrintIcon from '@mui/icons-material/Print';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DateRangeIcon from '@mui/icons-material/DateRange';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { supabase } from '../../../supabase';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Report types with icons
const reportTypes = [
  { value: 'waste_collection', label: 'Waste Collection', icon: <AssessmentIcon /> },
  { value: 'outward_sales', label: 'Material Sales', icon: <BarChartIcon /> },
  { value: 'inventory', label: 'Inventory Status', icon: <PieChartIcon /> },
  { value: 'financial', label: 'Financial Reports', icon: <TimelineIcon /> }
];

function ReportsList() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [reportType, setReportType] = useState('waste_collection');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [reportData, setReportData] = useState({
    wasteCollection: [],
    outwardSales: [],
    inventory: [],
    financial: []
  });
  const [error, setError] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Fetch locations
  useEffect(() => {
    async function fetchLocations() {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('id, name, type')
          .order('name');
        
        if (error) throw error;
        setLocations(data || []);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setError('Failed to load locations');
      }
    }
    
    fetchLocations();
  }, []);

  // Auto-generate reports when filters change
  useEffect(() => {
    if (autoRefreshEnabled) {
      fetchReportData();
    }
  }, [reportType, selectedLocation, startDate, endDate, autoRefreshEnabled]);

  // Fetch report data
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      // Fetch data based on report type
      switch (reportType) {
        case 'waste_collection':
          // Fetch rejected waste inward data
          let wasteQuery = supabase
            .from('rejected_waste_inward')
            .select(`
              id, 
              voucher_number, 
              transaction_date, 
              quantity, 
              total_amount,
              from_location:from_location_id(id, name, type),
              to_location:to_location_id(id, name, type)
            `)
            .gte('transaction_date', formattedStartDate)
            .lte('transaction_date', formattedEndDate)
            .order('transaction_date', { ascending: false });
            
          if (selectedLocation) {
            wasteQuery = wasteQuery.or(`from_location_id.eq.${selectedLocation},to_location_id.eq.${selectedLocation}`);
          }
          
          const { data: wasteData, error: wasteError } = await wasteQuery;
          
          if (wasteError) throw wasteError;
          
          // Process and set waste collection data
          const processedWasteData = wasteData.map(item => ({
            id: item.id,
            title: `RW-${item.voucher_number}`,
            date: item.transaction_date,
            quantity: item.quantity,
            amount: item.total_amount,
            from: item.from_location?.name || 'Unknown',
            to: item.to_location?.name || 'Unknown',
            description: `${item.quantity} kg from ${item.from_location?.name || 'Unknown'} to ${item.to_location?.name || 'Unknown'}`,
            type: 'waste_collection',
            icon: <AssessmentIcon />
          }));
          
          setReportData(prev => ({ ...prev, wasteCollection: processedWasteData }));
          break;
          
        case 'outward_sales':
          // Fetch segregated waste outward data
          let salesQuery = supabase
            .from('segregated_waste_outward')
            .select(`
              id, 
              voucher_number, 
              transaction_date, 
              total_quantity,
              total_amount,
              buyer:buyer_id(id, name, type)
            `)
            .gte('transaction_date', formattedStartDate)
            .lte('transaction_date', formattedEndDate)
            .order('transaction_date', { ascending: false });
            
          if (selectedLocation) {
            salesQuery = salesQuery.eq('buyer_id', selectedLocation);
          }
          
          const { data: salesData, error: salesError } = await salesQuery;
          
          if (salesError) throw salesError;
          
          // Process and set outward sales data
          const processedSalesData = salesData.map(item => ({
            id: item.id,
            title: `SW-${item.voucher_number}`,
            date: item.transaction_date,
            quantity: item.total_quantity,
            amount: item.total_amount,
            buyer: item.buyer?.name || 'Unknown',
            description: `${item.total_quantity} kg sold to ${item.buyer?.name || 'Unknown'}`,
            type: 'outward_sales',
            icon: <BarChartIcon />
          }));
          
          setReportData(prev => ({ ...prev, outwardSales: processedSalesData }));
          break;
          
        case 'inventory':
          // Fetch inventory data
          let inventoryQuery = supabase
            .from('inventory')
            .select(`
              id, 
              quantity,
              updated_at,
              location:location_id(id, name, type),
              material:material_id(id, name, code, description)
            `)
            .order('updated_at', { ascending: false });
            
          if (selectedLocation) {
            inventoryQuery = inventoryQuery.eq('location_id', selectedLocation);
          }
          
          const { data: inventoryData, error: inventoryError } = await inventoryQuery;
          
          if (inventoryError) throw inventoryError;
          
          // Process and set inventory data
          const processedInventoryData = inventoryData.map(item => ({
            id: item.id,
            title: `${item.material?.name || 'Unknown Material'}`,
            date: new Date(item.updated_at).toLocaleDateString(),
            quantity: item.quantity,
            location: item.location?.name || 'Unknown',
            material: item.material?.name || 'Unknown',
            materialCode: item.material?.code || '',
            description: `${item.quantity} kg at ${item.location?.name || 'Unknown'}`,
            type: 'inventory',
            icon: <PieChartIcon />
          }));
          
          setReportData(prev => ({ ...prev, inventory: processedInventoryData }));
          break;
          
        case 'financial':
          // Fetch payments data
          let paymentsQuery = supabase
            .from('payments')
            .select(`
              id, 
              amount,
              payment_date,
              payment_method,
              transaction_type,
              is_credit,
              bank_account:bank_account_id(name)
            `)
            .gte('payment_date', formattedStartDate)
            .lte('payment_date', formattedEndDate)
            .order('payment_date', { ascending: false });
            
          const { data: paymentsData, error: paymentsError } = await paymentsQuery;
          
          if (paymentsError) throw paymentsError;
          
          // Process and set financial data
          const processedFinancialData = paymentsData.map(item => ({
            id: item.id,
            title: `${item.transaction_type} (${item.is_credit ? 'Credit' : 'Debit'})`,
            date: item.payment_date,
            amount: item.amount,
            method: item.payment_method,
            account: item.bank_account?.name || 'Unknown',
            description: `${item.is_credit ? 'Received' : 'Paid'} ${item.amount} via ${item.payment_method}`,
            type: 'financial',
            icon: <TimelineIcon />
          }));
          
          setReportData(prev => ({ ...prev, financial: processedFinancialData }));
          break;
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  // Get current report data based on active tab/report type
  const getCurrentReportData = () => {
    switch (reportType) {
      case 'waste_collection':
        return reportData.wasteCollection;
      case 'outward_sales':
        return reportData.outwardSales;
      case 'inventory':
        return reportData.inventory;
      case 'financial':
        return reportData.financial;
      default:
        return [];
    }
  };

  // Export report to CSV
  const handleExportCSV = () => {
    const data = getCurrentReportData();
    if (!data || data.length === 0) return;
    
    // Prepare CSV based on report type
    let headers = [];
    let rows = [];
    
    switch (reportType) {
      case 'waste_collection':
        headers = ['Voucher', 'Date', 'From', 'To', 'Quantity (kg)', 'Amount'];
        rows = data.map(item => [
          item.title,
          item.date,
          item.from,
          item.to,
          item.quantity,
          item.amount
        ]);
        break;
        
      case 'outward_sales':
        headers = ['Voucher', 'Date', 'Buyer', 'Quantity (kg)', 'Amount'];
        rows = data.map(item => [
          item.title,
          item.date,
          item.buyer,
          item.quantity,
          item.amount
        ]);
        break;
        
      case 'inventory':
        headers = ['Material', 'Code', 'Location', 'Quantity (kg)', 'Last Updated'];
        rows = data.map(item => [
          item.material,
          item.materialCode,
          item.location,
          item.quantity,
          item.date
        ]);
        break;
        
      case 'financial':
        headers = ['Type', 'Date', 'Method', 'Account', 'Amount', 'Direction'];
        rows = data.map(item => [
          item.title.split(' ')[0],
          item.date,
          item.method,
          item.account,
          item.amount,
          item.title.includes('Credit') ? 'Credit' : 'Debit'
        ]);
        break;
    }
    
    // Create CSV content and download
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export report to PDF
  const handleExportPDF = () => {
    const data = getCurrentReportData();
    if (!data || data.length === 0) return;
    
    // Get report title
    const reportTitle = reportTypes.find(t => t.value === reportType)?.label || 'Report';
    
    // Create new PDF document
    const doc = new jsPDF();
    
    // Add report title
    doc.setFontSize(18);
    doc.text(`Malabar Eco Solutions - ${reportTitle}`, 14, 22);
    
    // Add report date range
    doc.setFontSize(12);
    doc.text(`Date Range: ${format(startDate, 'dd/MM/yyyy')} to ${format(endDate, 'dd/MM/yyyy')}`, 14, 30);
    
    // Add location if selected
    if (selectedLocation && locations.find(l => l.id === selectedLocation)) {
      doc.text(`Location: ${locations.find(l => l.id === selectedLocation)?.name}`, 14, 38);
    }
    
    // Prepare table data based on report type
    let tableColumns = [];
    let tableRows = [];
    
    switch (reportType) {
      case 'waste_collection':
        tableColumns = [
          { header: 'Voucher', dataKey: 'title' },
          { header: 'Date', dataKey: 'date' },
          { header: 'From', dataKey: 'from' },
          { header: 'To', dataKey: 'to' },
          { header: 'Quantity (kg)', dataKey: 'quantity' },
          { header: 'Amount (₹)', dataKey: 'amount' }
        ];
        tableRows = data.map(item => ({
          title: item.title,
          date: item.date,
          from: item.from,
          to: item.to,
          quantity: item.quantity.toLocaleString(),
          amount: item.amount.toLocaleString()
        }));
        break;
        
      case 'outward_sales':
        tableColumns = [
          { header: 'Voucher', dataKey: 'title' },
          { header: 'Date', dataKey: 'date' },
          { header: 'Buyer', dataKey: 'buyer' },
          { header: 'Quantity (kg)', dataKey: 'quantity' },
          { header: 'Amount (₹)', dataKey: 'amount' }
        ];
        tableRows = data.map(item => ({
          title: item.title,
          date: item.date,
          buyer: item.buyer,
          quantity: item.quantity.toLocaleString(),
          amount: item.amount.toLocaleString()
        }));
        break;
        
      case 'inventory':
        tableColumns = [
          { header: 'Material', dataKey: 'material' },
          { header: 'Code', dataKey: 'materialCode' },
          { header: 'Location', dataKey: 'location' },
          { header: 'Quantity (kg)', dataKey: 'quantity' },
          { header: 'Last Updated', dataKey: 'date' }
        ];
        tableRows = data.map(item => ({
          material: item.material,
          materialCode: item.materialCode,
          location: item.location,
          quantity: item.quantity.toLocaleString(),
          date: item.date
        }));
        break;
        
      case 'financial':
        tableColumns = [
          { header: 'Type', dataKey: 'type' },
          { header: 'Date', dataKey: 'date' },
          { header: 'Method', dataKey: 'method' },
          { header: 'Account', dataKey: 'account' },
          { header: 'Amount (₹)', dataKey: 'amount' },
          { header: 'Direction', dataKey: 'direction' }
        ];
        tableRows = data.map(item => ({
          type: item.title.split(' ')[0],
          date: item.date,
          method: item.method,
          account: item.account,
          amount: item.amount.toLocaleString(),
          direction: item.title.includes('Credit') ? 'Credit' : 'Debit'
        }));
        break;
    }
    
    // Generate the table
    doc.autoTable({
      startY: selectedLocation ? 46 : 38,
      columns: tableColumns,
      body: tableRows,
      headStyles: { fillColor: [63, 81, 181] },
      margin: { top: 15 },
      didDrawPage: function(data) {
        // Add footer with date and page numbers
        doc.setFontSize(10);
        doc.text(
          `Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      }
    });
    
    // Save PDF
    doc.save(`${reportType}_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setReportType(reportTypes[newValue].value);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Reports
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="outlined"
              sx={{ mr: 2 }}
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            >
              Auto-Refresh: {autoRefreshEnabled ? 'ON' : 'OFF'}
            </Button>
            <Button
              variant="contained"
              startIcon={<AssessmentIcon />}
              onClick={fetchReportData}
              sx={{
                backgroundColor: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.9)
                }
              }}
            >
              Refresh Report
            </Button>
          </Box>
        </Box>

        <Paper sx={{ p: 2, mb: 3 }}>
          {/* Report Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              variant="scrollable" 
              scrollButtons="auto"
            >
              {reportTypes.map((type, index) => (
                <Tab 
                  key={type.value} 
                  label={type.label} 
                  icon={type.icon} 
                  iconPosition="start" 
                  sx={{ 
                    minHeight: 48, 
                    textTransform: 'none',
                    fontWeight: activeTab === index ? 600 : 400
                  }}
                />
              ))}
            </Tabs>
          </Box>

          {/* Filters */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select
                fullWidth
                label="Location"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                size="small"
              >
                <MenuItem value="">All Locations</MenuItem>
                {locations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name} ({location.type})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => setStartDate(date)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(date) => setEndDate(date)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
          </Grid>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          )}

          {/* Loading State */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Report Results */}
          {!loading && getCurrentReportData().length > 0 ? (
            <>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                {reportTypes.find(t => t.value === reportType)?.label} Report
                {selectedLocation && locations.find(l => l.id === selectedLocation) && 
                 ` - ${locations.find(l => l.id === selectedLocation)?.name}`}
              </Typography>
              
              <Grid container spacing={3}>
                {getCurrentReportData().map((report) => (
                  <Grid item xs={12} md={6} key={report.id}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        transition: 'transform 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: theme.shadows[4]
                        }
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box
                              sx={{
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                borderRadius: '50%',
                                p: 1,
                                mr: 2
                              }}
                            >
                              {report.icon}
                            </Box>
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {report.title}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {report.date}
                              </Typography>
                            </Box>
                          </Box>
                          <Box>
                            <IconButton size="small" color="primary">
                              <DownloadIcon />
                            </IconButton>
                            <IconButton size="small" color="primary">
                              <PrintIcon />
                            </IconButton>
                          </Box>
                        </Box>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Grid container spacing={1}>
                          {/* Display relevant fields based on report type */}
                          {reportType === 'waste_collection' && (
                            <>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">From</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{report.from}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">To</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{report.to}</Typography>
                              </Grid>
                            </>
                          )}
                          
                          {reportType === 'outward_sales' && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="textSecondary">Buyer</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{report.buyer}</Typography>
                            </Grid>
                          )}
                          
                          {reportType === 'inventory' && (
                            <>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Material</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {report.material} {report.materialCode && `(${report.materialCode})`}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Location</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{report.location}</Typography>
                              </Grid>
                            </>
                          )}
                          
                          {reportType === 'financial' && (
                            <>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Method</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{report.method}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Account</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{report.account}</Typography>
                              </Grid>
                            </>
                          )}
                          
                          {/* Common fields */}
                          {report.quantity !== undefined && (
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Quantity</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{report.quantity.toLocaleString()} kg</Typography>
                            </Grid>
                          )}
                          
                          {report.amount !== undefined && (
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Amount</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                ₹{report.amount.toLocaleString()}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                        
                        <Button
                          variant="outlined"
                          size="small"
                          sx={{
                            mt: 2,
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                            '&:hover': {
                              borderColor: alpha(theme.palette.primary.main, 0.8),
                              backgroundColor: alpha(theme.palette.primary.main, 0.05)
                            }
                          }}
                        >
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <ButtonGroup variant="contained">
                  <Button 
                    startIcon={<DownloadIcon />}
                    onClick={handleExportCSV}
                  >
                    Export CSV
                  </Button>
                  <Button 
                    startIcon={<PictureAsPdfIcon />}
                    onClick={handleExportPDF}
                  >
                    Export PDF
                  </Button>
                  <Button 
                    startIcon={<PrintIcon />}
                    onClick={() => window.print()}
                  >
                    Print
                  </Button>
                </ButtonGroup>
              </Box>
            </>
          ) : !loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <DateRangeIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary">
                No data to display
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {autoRefreshEnabled 
                  ? "Try adjusting your filters to see results."
                  : "Please select report parameters and click \"Generate Report\" to see results."}
              </Typography>
              {!autoRefreshEnabled && (
                <Button 
                  variant="outlined" 
                  onClick={fetchReportData} 
                  startIcon={<AssessmentIcon />}
                >
                  Generate Report
                </Button>
              )}
            </Box>
          )}
        </Paper>
      </Container>
    </LocalizationProvider>
  );
}

export default ReportsList;