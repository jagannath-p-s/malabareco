import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Tooltip,
  Alert,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useAuth } from '../../../contexts/authcontext';
import { supabase } from '../../../supabase';
import bcrypt from 'bcryptjs';

const roles = [
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
];

function TeamList() {
  const { isAdmin } = useAuth();
  const [team, setTeam] = useState([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState({ email: '', role: 'staff', password: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwTarget, setPwTarget] = useState(null);
  const [pwValue, setPwValue] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Fetch team from Supabase
  useEffect(() => {
    const fetchTeam = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, created_at');
      if (error) {
        setAlert({ type: 'error', message: 'Failed to fetch staff.' });
      } else {
        setTeam(data || []);
      }
      setLoading(false);
    };
    fetchTeam();
  }, []);

  const handleSearch = (e) => setSearch(e.target.value);

  const filteredTeam = team.filter(
    (member) =>
      (member.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (member.role || '').toLowerCase().includes(search.toLowerCase())
  );

  // Add/Edit logic
  const handleDialogOpen = (member = null) => {
    setEditMode(!!member);
    setSelectedMember(member);
    setForm(
      member
        ? { email: member.email, role: member.role, password: '' }
        : { email: '', role: 'staff', password: '' }
    );
    setDialogOpen(true);
  };
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedMember(null);
    setForm({ email: '', role: 'staff', password: '' });
  };
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleSave = async () => {
    if (!form.email) {
      setAlert({ type: 'error', message: 'Email is required.' });
      return;
    }
    if (!editMode && (!form.password || form.password.length < 8)) {
      setAlert({ type: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }
    setLoading(true);
    if (editMode) {
      // Update in Supabase
      const { error } = await supabase
        .from('users')
        .update({
          email: form.email,
          role: form.role,
        })
        .eq('id', selectedMember.id);
      if (error) {
        setAlert({ type: 'error', message: 'Failed to update staff.' });
      } else {
        setAlert({ type: 'success', message: 'Staff updated successfully.' });
        setTeam((prev) => prev.map((m) => (m.id === selectedMember.id ? { ...form, id: m.id, created_at: m.created_at } : m)));
      }
    } else {
      // Insert in Supabase with hashed password
      const hashed = await bcrypt.hash(form.password, 10);
      const { data, error } = await supabase
        .from('users')
        .insert([{ email: form.email, role: form.role, password: hashed }])
        .select();
      if (error) {
        setAlert({ type: 'error', message: 'Failed to add staff.' });
      } else {
        setAlert({ type: 'success', message: 'Staff added successfully.' });
        setTeam((prev) => [...prev, ...(data || [])]);
      }
    }
    setLoading(false);
    handleDialogClose();
  };

  // Delete logic
  const handleDeleteDialogOpen = (member) => {
    setDeleteTarget(member);
    setDeleteDialogOpen(true);
  };
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };
  const handleDelete = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', deleteTarget.id);
    if (error) {
      setAlert({ type: 'error', message: 'Failed to delete staff.' });
    } else {
      setAlert({ type: 'success', message: 'Staff deleted successfully.' });
      setTeam((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    }
    setLoading(false);
    handleDeleteDialogClose();
  };

  // View logic
  const handleViewDialogOpen = (member) => {
    setViewTarget(member);
    setViewDialogOpen(true);
  };
  const handleViewDialogClose = () => {
    setViewDialogOpen(false);
    setViewTarget(null);
  };

  // Table pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Change password logic
  const handlePwDialogOpen = (member) => {
    setPwTarget(member);
    setPwValue('');
    setPwDialogOpen(true);
  };
  const handlePwDialogClose = () => {
    setPwDialogOpen(false);
    setPwTarget(null);
    setPwValue('');
  };
  const handlePwChange = (e) => setPwValue(e.target.value);
  const handlePwSubmit = async () => {
    if (!pwValue || pwValue.length < 8) {
      setAlert({ type: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }
    setPwLoading(true);
    const hashed = await bcrypt.hash(pwValue, 10);
    const { error } = await supabase
      .from('users')
      .update({ password: hashed })
      .eq('id', pwTarget.id);
    if (error) {
      setAlert({ type: 'error', message: 'Failed to change password.' });
    } else {
      setAlert({ type: 'success', message: 'Password changed successfully.' });
    }
    setPwLoading(false);
    handlePwDialogClose();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
            Team Members
          </Typography>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleDialogOpen()}
              sx={{ borderRadius: 2 }}
            >
              Add Staff
            </Button>
          )}
        </Box>
        {alert.message && (
          <Alert severity={alert.type} sx={{ mb: 2 }}>{alert.message}</Alert>
        )}
        <TextField
          placeholder="Search by email or role"
          value={search}
          onChange={handleSearch}
          fullWidth
          size="small"
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTeam.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell>{member.email}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{member.role}</TableCell>
                  <TableCell>{member.created_at ? new Date(member.created_at).toLocaleString() : ''}</TableCell>
                  <TableCell align="right">
                    {isAdmin && (
                      <>
                        <Tooltip title="Change Password">
                          <IconButton size="small" onClick={() => handlePwDialogOpen(member)}>
                            <LockResetIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleDialogOpen(member)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDeleteDialogOpen(member)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredTeam.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 8, 16, 32]}
        />
      </Paper>

      {/* Add/Edit Staff Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="xs" fullWidth>
        <DialogTitle>{editMode ? 'Edit Staff' : 'Add Staff'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Email"
            name="email"
            value={form.email}
            onChange={handleFormChange}
            fullWidth
            required
          />
          <TextField
            margin="dense"
            label="Role"
            name="role"
            value={form.role}
            onChange={handleFormChange}
            select
            fullWidth
          >
            {roles.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          {!editMode && (
            <TextField
              margin="dense"
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleFormChange}
              fullWidth
              required
              helperText="Password must be at least 8 characters."
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>{editMode ? 'Save' : 'Add'}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose} maxWidth="xs">
        <DialogTitle>Delete Staff</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <b>{deleteTarget?.email}</b>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* View Staff Dialog */}
      <Dialog open={viewDialogOpen} onClose={handleViewDialogClose} maxWidth="xs" fullWidth>
        <DialogTitle>Staff Details</DialogTitle>
        <DialogContent>
          {viewTarget && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}><b>Email:</b> {viewTarget.email}</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}><b>Role:</b> {viewTarget.role}</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}><b>Created At:</b> {viewTarget.created_at ? new Date(viewTarget.created_at).toLocaleString() : ''}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleViewDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={pwDialogOpen} onClose={handlePwDialogClose} maxWidth="xs" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="New Password"
            type="password"
            value={pwValue}
            onChange={handlePwChange}
            fullWidth
            required
            helperText="Password must be at least 8 characters."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePwDialogClose}>Cancel</Button>
          <Button onClick={handlePwSubmit} variant="contained" color="primary" disabled={pwLoading}>Change</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TeamList; 