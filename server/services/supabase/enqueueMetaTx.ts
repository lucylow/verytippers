import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

const url = process.env.SUPABASE_URL || config.SUPABASE?.URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE?.SERVICE_ROLE_KEY || '';

if (!url || !serviceKey) {
  console.warn('Supabase service role key not configured. MetaTx enqueueing will fail.');
}

const supabase = createClient(url, serviceKey, { 
  auth: { persistSession: false } 
});

/**
 * Enqueue a meta-transaction for relayer processing
 * @param tipId - UUID of the tip record
 * @param metaPayload - Meta-transaction payload (to, amount, cidHash, nonce, from, etc.)
 * @returns The inserted queue record
 */
export async function enqueueMetaTx(tipId: string, metaPayload: any) {
  if (!url || !serviceKey) {
    throw new Error('Supabase service role key not configured');
  }

  // metaPayload could be { to, amount, cidHash, nonce, from, signature, etc. }
  const { data, error } = await supabase
    .from('meta_tx_queue')
    .insert({
      tip_id: tipId,
      payload: metaPayload,
      status: 'queued',
      priority: metaPayload.priority || 100
    })
    .select()
    .single();

  if (error) {
    console.error('Error enqueueing metaTx:', error);
    throw error;
  }

  // Log the enqueue action
  await supabase.from('relayer_logs').insert({
    tip_id: tipId,
    action: 'enqueue_meta_tx',
    actor: 'orchestrator',
    detail: { queue_id: data.id, priority: data.priority }
  });

  return data;
}

/**
 * Update meta-transaction queue status
 */
export async function updateMetaTxStatus(
  queueId: number, 
  status: 'queued' | 'processing' | 'done' | 'failed',
  error?: string
) {
  if (!url || !serviceKey) {
    throw new Error('Supabase service role key not configured');
  }

  const updateData: any = { status };
  if (error) {
    updateData.payload = { ...updateData.payload, error };
  }

  const { data, error: updateError } = await supabase
    .from('meta_tx_queue')
    .update(updateData)
    .eq('id', queueId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating metaTx status:', updateError);
    throw updateError;
  }

  return data;
}

