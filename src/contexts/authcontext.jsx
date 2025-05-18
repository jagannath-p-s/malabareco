// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import bcrypt from 'bcryptjs';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored session on load
    const storedSession = localStorage.getItem('userSession');
    if (storedSession) {
      setUser(JSON.parse(storedSession));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw error;

      if (data) {
        // Verify the password using bcrypt
        const isValidPassword = await bcrypt.compare(password, data.password);
        
        if (isValidPassword) {
          const userData = {
            id: data.id,
            email: data.email,
            role: data.role
          };
          
          // Save session to localStorage
          localStorage.setItem('userSession', JSON.stringify(userData));
          setUser(userData);
          return { success: true, user: userData };
        } else {
          return { success: false, message: 'Invalid password' };
        }
      } else {
        return { success: false, message: 'User not found' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('userSession');
    setUser(null);
  };

  // Change password logic
  const changePassword = async (userId, currentPassword, newPassword) => {
    try {
      // Fetch the user from Supabase
      const { data, error } = await supabase
        .from('users')
        .select('password')
        .eq('id', userId)
        .single();
      if (error) throw error;
      if (!data) return { success: false, message: 'User not found' };

      // Compare current password
      const isValid = await bcrypt.compare(currentPassword, data.password);
      if (!isValid) {
        return { success: false, message: 'Current password is incorrect' };
      }

      // Hash new password
      const hashed = await bcrypt.hash(newPassword, 10);
      // Update password in Supabase
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashed })
        .eq('id', userId);
      if (updateError) throw updateError;
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isStaff: user?.role === 'staff'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
