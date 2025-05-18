import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  FormHelperText,
  Box,
  Typography,
  InputAdornment,
  Divider,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { supabase } from '../../../supabase';

function PaymentDialog({ open, onClose, payment = null, onSave }) {
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    payment_date: new Date(),
    transaction_type: 'REVENUE',
    reference_type: 'general',
    amount: '',
    payment_method: 'bank_transfer',
    reference_number: '',
    bank_account_id: '',
    staff_id: '',
    notes: '',
    is_credit: true
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchBankAccounts();
    fetchStaffMembers();
    if (payment) {
      setFormData({
        payment_date: new Date(payment.payment_date),
        transaction_type: payment.transaction_type || 'REVENUE',
        reference_type: payment.staff_id ? 'staff' : 'general',
        amount: payment.amount.toString(),
        payment_method: payment.payment_method,
        reference_number: payment.reference_number || '',
        bank_account_id: payment.bank_account_id,
        staff_id: payment.staff_id || '',
        notes: payment.notes || '',
        is_credit: ['REVENUE', 'COMMISSION'].includes(payment.transaction_type)
      });
    }
  }, [payment]);

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, name, account_type')
        .order('name');

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      setError('Failed to load bank accounts');
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .in('role', ['staff', 'manager'])
        .order('email');

      if (error) throw error;
      setStaffMembers(data || []);
    } catch (error) {
      console.error('Error fetching staff members:', error);
      setError('Failed to load staff members');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updates = { [field]: value };
      
      if (field === 'transaction_type') {
        const isCredit = ['REVENUE', 'COMMISSION'].includes(value);
        updates.is_credit = isCredit;
        
        if (value === 'STAFF_PAYMENT') {
          updates.reference_type = 'staff';
        } else if (prev.reference_type === 'staff') {
          updates.reference_type = 'general';
          updates.staff_id = '';
        }
      }
      
      if (field === 'reference_type' && value !== 'staff') {
        updates.staff_id = '';
      }
      
      return { ...prev, ...updates };
    });
    
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Please enter a valid amount';
    }
    if (!formData.bank_account_id) {
      errors.bank_account_id = 'Please select a bank account';
    }
    if (formData.transaction_type === 'STAFF_PAYMENT' && !formData.staff_id) {
      errors.staff_id = 'Please select a staff member';
    }
    if (!formData.payment_method) {
      errors.payment_method = 'Please select a payment method';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const paymentData = {
        payment_date: formData.payment_date.toISOString(),
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || null,
        bank_account_id: formData.bank_account_id,
        notes: formData.notes || null,
        transaction_type: formData.transaction_type,
        is_credit: formData.is_credit,
        staff_id: formData.staff_id || null,
        transaction_id: payment?.transaction_id || crypto.randomUUID()
      };

      if (payment) {
        // Update existing payment
        const { error: paymentError } = await supabase
          .from('payments')
          .update(paymentData)
          .eq('id', payment.id);

        if (paymentError) throw paymentError;

        // Update staff ledger if it's a staff payment
        if (formData.staff_id) {
          const staffLedgerData = {
            staff_id: formData.staff_id,
            transaction_date: formData.payment_date.toISOString(),
            amount: parseFloat(formData.amount),
            is_payment_to_staff: formData.transaction_type === 'STAFF_PAYMENT',
            description: formData.notes || 'Staff payment',
            payment_method: formData.payment_method,
            reference_number: formData.reference_number,
            payment_id: payment.id,
            running_balance: 0 // This will be recalculated by the trigger
          };

          const { error: ledgerError } = await supabase
            .from('staff_ledger')
            .upsert([staffLedgerData], {
              onConflict: 'payment_id',
              ignoreDuplicates: false
            });

          if (ledgerError) throw ledgerError;
        }
      } else {
        // Create new payment
        const { data: newPayment, error: paymentError } = await supabase
          .from('payments')
          .insert([paymentData])
          .select()
          .single();

        if (paymentError) throw paymentError;

        // Create staff ledger entry if it's a staff payment
        if (formData.staff_id) {
          const staffLedgerData = {
            staff_id: formData.staff_id,
            transaction_date: formData.payment_date.toISOString(),
            amount: parseFloat(formData.amount),
            is_payment_to_staff: formData.transaction_type === 'STAFF_PAYMENT',
            description: formData.notes || 'Staff payment',
            payment_method: formData.payment_method,
            reference_number: formData.reference_number,
            payment_id: newPayment.id,
            running_balance: 0 // This will be calculated by the trigger
          };

          const { error: ledgerError } = await supabase
            .from('staff_ledger')
            .insert([staffLedgerData]);

          if (ledgerError) throw ledgerError;
        }
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving payment:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {payment ? 'Edit Payment' : 'New Payment'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Payment Date"
              value={formData.payment_date}
              onChange={(newValue) => handleInputChange('payment_date', newValue)}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </LocalizationProvider>

          <FormControl fullWidth size="small">
            <InputLabel>Transaction Type</InputLabel>
            <Select
              value={formData.transaction_type}
              onChange={(e) => handleInputChange('transaction_type', e.target.value)}
              label="Transaction Type"
            >
              <MenuItem value="REVENUE">Revenue</MenuItem>
              <MenuItem value="EXPENSE">Expense</MenuItem>
              <MenuItem value="COMMISSION">Commission</MenuItem>
              <MenuItem value="STAFF_PAYMENT">Staff Payment</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Reference Type</InputLabel>
            <Select
              value={formData.reference_type}
              onChange={(e) => handleInputChange('reference_type', e.target.value)}
              label="Reference Type"
            >
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="staff">Staff Payment</MenuItem>
              <MenuItem value="commission">Commission</MenuItem>
            </Select>
          </FormControl>

          {formData.reference_type === 'staff' && (
            <FormControl fullWidth size="small" error={!!formErrors.staff_id}>
              <InputLabel>Staff Member</InputLabel>
              <Select
                value={formData.staff_id}
                onChange={(e) => handleInputChange('staff_id', e.target.value)}
                label="Staff Member"
              >
                {staffMembers.map(staff => (
                  <MenuItem key={staff.id} value={staff.id}>
                    {staff.email}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.staff_id && (
                <FormHelperText>{formErrors.staff_id}</FormHelperText>
              )}
            </FormControl>
          )}

          <FormControl fullWidth size="small" error={!!formErrors.bank_account_id}>
            <InputLabel>Bank Account</InputLabel>
            <Select
              value={formData.bank_account_id}
              onChange={(e) => handleInputChange('bank_account_id', e.target.value)}
              label="Bank Account"
            >
              {bankAccounts.map(account => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name} ({account.account_type})
                </MenuItem>
              ))}
            </Select>
            {formErrors.bank_account_id && (
              <FormHelperText>{formErrors.bank_account_id}</FormHelperText>
            )}
          </FormControl>

          <TextField
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            error={!!formErrors.amount}
            helperText={formErrors.amount}
            size="small"
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
            }}
          />

          <FormControl fullWidth size="small" error={!!formErrors.payment_method}>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={formData.payment_method}
              onChange={(e) => handleInputChange('payment_method', e.target.value)}
              label="Payment Method"
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
              <MenuItem value="cheque">Cheque</MenuItem>
              <MenuItem value="upi">UPI</MenuItem>
            </Select>
            {formErrors.payment_method && (
              <FormHelperText>{formErrors.payment_method}</FormHelperText>
            )}
          </FormControl>

          <TextField
            label="Reference Number"
            value={formData.reference_number}
            onChange={(e) => handleInputChange('reference_number', e.target.value)}
            size="small"
            placeholder="Optional"
          />

          <TextField
            label="Notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            size="small"
            multiline
            rows={2}
            placeholder="Optional"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PaymentDialog; 