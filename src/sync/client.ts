import './polyfill';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './config';

let client: SupabaseClient | null = null;

// Created on first use. Signed out, nothing touches the network.
export const getClient = () => client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
