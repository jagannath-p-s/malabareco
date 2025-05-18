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
  Alert,
  InputAdornment
} from '@mui/material';
import { supabase } from '../../../supabase';

function BankTransactionDialog({ open, onClose, bankAccount, transactionType = 'DEPOSIT', onSave }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    transaction_type: transactionType,
    amount: '',
    reference_number: '',
    description: ''
  });

  const [formErrors, setFormErrors] = useState({});

  // Reset form when dialog opens or transaction type changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      transaction_type: transactionType
    }));
  }, [transactionType, open]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
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
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;

      if (!user) {
        throw new Error('You must be logged in to perform this action');
      }

      const transactionData = {
        bank_account_id: bankAccount.id,
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        reference_number: formData.reference_number || null,
        description: formData.description || null,
        performed_by: user.id,
        transaction_date: new Date().toISOString()
      };

      const { error: transactionError } = await supabase
        .from('bank_transactions')
        .insert([transactionData]);

      if (transactionError) throw transactionError;

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
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
        {bankAccount ? `${formData.transaction_type === 'DEPOSIT' ? 'Deposit To' : 'Withdraw From'} ${bankAccount.name}` : 'Bank Transaction'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth size="small">
            <InputLabel>Transaction Type</InputLabel>
            <Select
              value={formData.transaction_type}
              onChange={(e) => handleInputChange('transaction_type', e.target.value)}
              label="Transaction Type"
            >
              <MenuItem value="DEPOSIT">Deposit</MenuItem>
              <MenuItem value="WITHDRAWAL">Withdrawal</MenuItem>
            </Select>
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

          <TextField
            label="Reference Number"
            value={formData.reference_number}
            onChange={(e) => handleInputChange('reference_number', e.target.value)}
            size="small"
            placeholder="Optional"
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
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
          {loading ? 'Processing...' : formData.transaction_type === 'DEPOSIT' ? 'Deposit' : 'Withdraw'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default BankTransactionDialog; 