import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pfansbyfcccdexyrlxho.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmYW5zYnlmY2NjZGV4eXJseGhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMjY2OTIsImV4cCI6MjA2MjgwMjY5Mn0.CigfAGLKn_k1T55IhM8JGqUlyE6ZQmVctUb918VmHbo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
