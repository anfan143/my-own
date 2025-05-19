import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Create the Supabase client with retries and timeout
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-application-name': 'home-services',
    },
  },
  db: {
    schema: 'public',
  },
});

// Test the connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('customer_projects').select('id').limit(1);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};