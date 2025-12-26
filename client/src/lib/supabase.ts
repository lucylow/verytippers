import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate URL format
let isValidUrl = false;
if (SUPABASE_URL) {
  try {
    new URL(SUPABASE_URL);
    isValidUrl = true;
  } catch (e) {
    console.error('❌ Invalid SUPABASE_URL format:', SUPABASE_URL);
  }
}

// Create client with validated configuration
let supabaseClient: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const missing = [];
    if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
    if (!SUPABASE_ANON_KEY) missing.push('VITE_SUPABASE_ANON_KEY');
    
    console.warn(
      `⚠️  Supabase configuration missing: ${missing.join(', ')}\n` +
      'Please add these environment variables to your .env file.\n' +
      'Some features may not work correctly without Supabase configuration.'
    );
    
    // Return a placeholder client that will fail gracefully
    // This prevents the app from crashing during build/SSR
    supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder-key');
    return supabaseClient;
  }

  if (!isValidUrl) {
    console.error('❌ Invalid SUPABASE_URL format:', SUPABASE_URL);
    supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder-key');
    return supabaseClient;
  }

  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'x-client-info': 'verytippers-client',
      },
    },
  });

  return supabaseClient;
}

export const supabase = createSupabaseClient();

/**
 * Health check for Supabase connection (client-side)
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    // Simple query to check connection
    const { error } = await supabase.from('users').select('count').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return false;
  }
}

