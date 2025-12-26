/**
 * Centralized Supabase client for server-side operations
 * 
 * This module provides a singleton Supabase client instance with:
 * - Service role key for elevated permissions
 * - Proper error handling and validation
 * - Connection health checks
 * - Retry logic support
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import type { Database } from './types/supabase';

let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * Get or create the Supabase client instance
 * Uses service role key for backend operations
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.SUPABASE_URL || config.SUPABASE?.URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE?.SERVICE_ROLE_KEY || '';

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    throw new Error(`Invalid SUPABASE_URL format: ${url}`);
  }

  // Validate service key is not the anon key (common mistake)
  const anonKey = process.env.SUPABASE_ANON_KEY || config.SUPABASE?.ANON_KEY || '';
  if (serviceKey === anonKey && anonKey) {
    console.warn(
      '⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY appears to be the same as ANON_KEY. ' +
      'Service role key should be different for security.'
    );
  }

  supabaseClient = createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'verytippers-server',
      },
    },
  });

  return supabaseClient;
}

/**
 * Health check for Supabase connection
 */
export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    // Simple query to check connection
    const { error } = await client.from('users').select('count').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase health check failed:', error);
    return false;
  }
}

/**
 * Execute a Supabase operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors (e.g., validation errors)
      if (lastError.message.includes('violates') || lastError.message.includes('duplicate')) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        const backoffDelay = delayMs * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(`Supabase operation failed, retrying (${attempt}/${maxRetries})...`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Default export: Lazy-initialized Supabase client
 * Use getSupabaseClient() for explicit initialization
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    return (getSupabaseClient() as any)[prop];
  }
});

