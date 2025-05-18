// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DashboardOverview from '../components/dashboard/overview/DashboardOverview';
import TransactionsRoutes from '../components/dashboard/transactions/TransactionsRoutes';
import ProjectsList from '../components/dashboard/projects/ProjectsList';
import ReportsList from '../components/dashboard/reports/ReportsList';
import TeamList from '../components/dashboard/team/TeamList';
import ChangePassword from '../components/dashboard/profile/ChangePassword';
import InventoryRoutes from '../components/dashboard/inventory/InventoryRoutes';
import MasterDataRoutes from '../components/dashboard/master/MasterDataRoutes';
import FinanceRoutes from '../components/dashboard/finance/FinanceRoutes';
import MenuIcon from '@mui/icons-material/Menu';
import { IconButton, AppBar, Toolbar as MuiToolbar } from '@mui/material';

function Dashboard({ darkMode, setDarkMode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Get the current section from the URL path
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/dashboard/overview') return 'overview';
    if (path.startsWith('/dashboard/transactions')) return 'transactions';
    if (path.startsWith('/dashboard/projects')) return 'projects';
    if (path.startsWith('/dashboard/reports')) return 'reports';
    if (path.startsWith('/dashboard/team')) return 'team';
    if (path.startsWith('/dashboard/change-password')) return 'change-password';
    if (path.startsWith('/dashboard/inventory')) return 'inventory';
    if (path.startsWith('/dashboard/finance')) return 'finance';
    if (path.startsWith('/dashboard/master')) return 'master';
    return 'overview';
  };

  // Redirect to overview if on root dashboard path
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      navigate('/dashboard/overview', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { md: `calc(100% - ${260}px)` },
          ml: { md: `${30}px` },
          backgroundColor: theme.palette.background.default,
          minHeight: '100vh',
          position: 'relative',
        }}
      >
        {/* Mobile AppBar for menu icon */}
        {isMobile && (
          <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 2 }}>
            <MuiToolbar disableGutters sx={{ minHeight: 48, px: 2 }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            </MuiToolbar>
          </AppBar>
        )}
        
        {/* Routes */}
        <Routes>
          <Route path="/overview" element={<DashboardOverview />} />
          <Route path="/transactions/*" element={<TransactionsRoutes />} />
          <Route path="/projects" element={<ProjectsList />} />
          <Route path="/reports" element={<ReportsList />} />
          <Route path="/team" element={<TeamList />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/inventory/*" element={<InventoryRoutes />} />
          
          {/* Master Data Routes */}
          <Route path="/master/*" element={<MasterDataRoutes />} />
          
          {/* Finance Routes */}
          <Route path="/finance/*" element={<FinanceRoutes />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default Dashboard;