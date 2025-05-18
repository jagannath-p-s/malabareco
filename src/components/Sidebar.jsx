// src/components/Sidebar.jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/authcontext';
import {
  Box,
  Drawer,
  List,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  IconButton,
  Collapse,
  Tooltip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import NightlightIcon from '@mui/icons-material/Nightlight';
import LightModeIcon from '@mui/icons-material/LightMode';
import LockIcon from '@mui/icons-material/Lock';
import ArchiveIcon from '@mui/icons-material/Archive';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CategoryIcon from '@mui/icons-material/Category';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

const drawerWidth = 260;

function Sidebar({ mobileOpen, handleDrawerToggle, darkMode, toggleDarkMode }) {
  const { user, logout, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [masterDataOpen, setMasterDataOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleProfile = () => {
    setProfileOpen(!profileOpen);
  };

  const toggleTransactions = () => {
    setTransactionsOpen(!transactionsOpen);
  };

  const toggleMasterData = () => {
    setMasterDataOpen(!masterDataOpen);
  };

  const toggleFinance = () => {
    setFinanceOpen(!financeOpen);
  };

  // Define menu items based on user role
  const dashboardItem = { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/dashboard',
      active: location.pathname === '/dashboard'
  };

  // Define transaction menu items
  const transactionItems = [
    { 
      text: 'Inward Entries', 
      icon: <ArchiveIcon />, 
      path: '/dashboard/transactions/inward',
      active: location.pathname.startsWith('/dashboard/transactions/inward')
    },
    { 
      text: 'Segregated Outward', 
      icon: <ShoppingCartIcon />, 
      path: '/dashboard/transactions/segregated-outward',
      active: location.pathname.startsWith('/dashboard/transactions/segregated-outward')
    },
    { 
      text: 'Rejected Outward', 
      icon: <LocalShippingIcon />, 
      path: '/dashboard/transactions/rejected-outward',
      active: location.pathname.startsWith('/dashboard/transactions/rejected-outward')
    },
  ];

  // Define master data menu items
  const masterDataItems = [
    { 
      text: 'Locations', 
      icon: <LocationOnIcon />, 
      path: '/dashboard/master/locations',
      active: location.pathname.startsWith('/dashboard/master/locations')
    },
    { 
      text: 'Materials', 
      icon: <CategoryIcon />, 
      path: '/dashboard/master/materials',
      active: location.pathname.startsWith('/dashboard/master/materials')
    },
  ];

  // Define finance menu items
  const financeItems = [
    { 
      text: 'Payments', 
      icon: <PaymentsIcon />, 
      path: '/dashboard/finance/payments',
      active: location.pathname.startsWith('/dashboard/finance/payments')
    },
    { 
      text: 'Bank Accounts', 
      icon: <AccountBalanceIcon />, 
      path: '/dashboard/finance/accounts',
      active: location.pathname.startsWith('/dashboard/finance/accounts')
    },
    { 
      text: 'Staff Ledger', 
      icon: <AccountBalanceWalletIcon />, 
      path: '/dashboard/finance/staff-ledger',
      active: location.pathname.startsWith('/dashboard/finance/staff-ledger')
    }
  ];

  // Define other menu items
  const inventoryItem = { 
    text: 'Inventory', 
    icon: <InventoryIcon />, 
    path: '/dashboard/inventory',
    active: location.pathname.startsWith('/dashboard/inventory')
  };

  const reportsItem = { 
    text: 'Reports', 
    icon: <BarChartIcon />, 
    path: '/dashboard/reports',
    active: location.pathname.startsWith('/dashboard/reports')
  };

  const teamItem = { 
    text: 'Staff Management', 
      icon: <PeopleIcon />, 
      path: '/dashboard/team',
    active: location.pathname.startsWith('/dashboard/team')
  };

  const drawer = (
    <>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: [1],
          height: 70,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 40, marginRight: 10 }} />
          <Typography variant="h6" fontWeight="bold" noWrap sx={{ letterSpacing: '0.5px' }}>
            Malabar Eco
          </Typography>
        </Box>
      </Toolbar>
      <Divider />

      {/* User profile section with dropdown */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <ListItemButton 
          onClick={toggleProfile}
          sx={{ 
            borderRadius: 2,
            mb: 0.5,
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <Avatar 
            sx={{ 
              bgcolor: 'primary.main', 
              width: 42, 
              height: 42,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {user?.email?.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ ml: 2, flex: 1 }}>
            <Typography variant="body2" fontWeight="600" noWrap>
              {user?.email?.split('@')[0]}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {user?.role}
            </Typography>
          </Box>
          {profileOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </ListItemButton>

        <Collapse in={profileOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton 
              sx={{ 
                pl: 2, 
                py: 0.75, 
                borderRadius: 2,
                mb: 0.5,
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => navigate('/dashboard/change-password')}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <LockIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Change Password" primaryTypographyProps={{ fontSize: '0.875rem' }} />
            </ListItemButton>
            
            <ListItemButton 
              sx={{ 
                pl: 2, 
                py: 0.75, 
                borderRadius: 2,
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={toggleDarkMode}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {darkMode ? <LightModeIcon fontSize="small" /> : <NightlightIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText 
                primary={darkMode ? "Light Mode" : "Dark Mode"} 
                primaryTypographyProps={{ fontSize: '0.875rem' }} 
              />
            </ListItemButton>
          </List>
        </Collapse>
      </Box>
      
      <Divider />
      
      {/* Navigation Menu */}
      <Box sx={{ px: 2, py: 1, overflowY: 'auto' }}>
        <Typography variant="overline" color="text.secondary" sx={{ px: 1, fontWeight: 500 }}>
          MAIN NAVIGATION
        </Typography>
        <List component="nav" sx={{ pt: 0.5 }}>
          {/* Dashboard */}
          <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
              selected={dashboardItem.active}
              onClick={() => navigate(dashboardItem.path)}
                sx={{ 
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    }
                  },
                }}
              >
              <ListItemIcon sx={{ minWidth: 40 }}>{dashboardItem.icon}</ListItemIcon>
              <ListItemText 
                primary={dashboardItem.text} 
                primaryTypographyProps={{ fontWeight: dashboardItem.active ? 600 : 400 }} 
              />
            </ListItemButton>
          </ListItem>

          {/* Transactions with submenu */}
          <ListItem disablePadding sx={{ display: 'block', mb: 0.5 }}>
            <ListItemButton
              onClick={toggleTransactions}
              sx={{ 
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <ArchiveIcon />
              </ListItemIcon>
              <ListItemText primary="Transactions" />
              {transactionsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={transactionsOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {transactionItems.map((item) => (
                  <ListItemButton
                    key={item.text}
                    selected={item.active}
                    onClick={() => navigate(item.path)}
                    sx={{ 
                      pl: 4,
                      borderRadius: 2,
                      ml: 2,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'white',
                        }
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: item.active ? 600 : 400 }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </ListItem>

          {/* Inventory */}
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={inventoryItem.active}
              onClick={() => navigate(inventoryItem.path)}
              sx={{ 
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  }
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{inventoryItem.icon}</ListItemIcon>
              <ListItemText 
                primary={inventoryItem.text} 
                primaryTypographyProps={{ fontWeight: inventoryItem.active ? 600 : 400 }} 
              />
            </ListItemButton>
          </ListItem>

          {/* Finance section with submenu */}
          <ListItem disablePadding sx={{ display: 'block', mb: 0.5 }}>
            <ListItemButton
              onClick={toggleFinance}
              sx={{ 
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <PaymentsIcon />
              </ListItemIcon>
              <ListItemText primary="Finance" />
              {financeOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={financeOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {financeItems.map((item) => (
                  <ListItemButton
                    key={item.text}
                    selected={item.active}
                    onClick={() => navigate(item.path)}
                    sx={{ 
                      pl: 4,
                      borderRadius: 2,
                      ml: 2,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'white',
                        }
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                      primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: item.active ? 600 : 400 }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </ListItem>

          {/* Staff Management */}
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={teamItem.active}
              onClick={() => navigate(teamItem.path)}
              sx={{ 
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  }
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{teamItem.icon}</ListItemIcon>
              <ListItemText 
                primary={teamItem.text} 
                primaryTypographyProps={{ fontWeight: teamItem.active ? 600 : 400 }} 
              />
            </ListItemButton>
          </ListItem>

          {/* Reports */}
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={reportsItem.active}
              onClick={() => navigate(reportsItem.path)}
              sx={{ 
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  }
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{reportsItem.icon}</ListItemIcon>
              <ListItemText 
                primary={reportsItem.text} 
                primaryTypographyProps={{ fontWeight: reportsItem.active ? 600 : 400 }} 
              />
            </ListItemButton>
          </ListItem>

          {/* Master Data section with submenu - Admin & Manager only */}
          {(isAdmin || isManager) && (
            <ListItem disablePadding sx={{ display: 'block', mb: 0.5 }}>
              <ListItemButton
                onClick={toggleMasterData}
                sx={{ 
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <CategoryIcon />
                </ListItemIcon>
                <ListItemText primary="Master Data" />
                {masterDataOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
              <Collapse in={masterDataOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {masterDataItems.map((item) => (
                    <ListItemButton
                      key={item.text}
                      selected={item.active}
                      onClick={() => navigate(item.path)}
                      sx={{ 
                        pl: 4,
                        borderRadius: 2,
                        ml: 2,
                        '&.Mui-selected': {
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                          },
                          '& .MuiListItemIcon-root': {
                            color: 'white',
                          }
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                      <ListItemText 
                        primary={item.text} 
                        primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: item.active ? 600 : 400 }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </ListItem>
          )}
        </List>
      </Box>
      
      <Box sx={{ flexGrow: 1 }} />
      
      {/* Logout Section */}
      <Box sx={{ p: 2 }}>
        <Divider sx={{ mb: 1.5 }} />
        <ListItemButton
          onClick={handleLogout}
          sx={{ 
            borderRadius: 2,
            color: 'text.primary',
            '&:hover': {
              bgcolor: 'error.light',
              color: 'error.contrastText',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </Box>
    </>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
}

export default Sidebar;