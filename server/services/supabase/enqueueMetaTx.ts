import { getSupabaseClient } from '../../lib/supabase';

// Initialize Supabase (centralized client)
const supabase = getSupabaseClient();

/**
 * Enqueue a meta-transaction for relayer processing
 * @param tipId - UUID of the tip record
 * @param metaPayload - Meta-transaction payload (to, amount, cidHash, nonce, from, etc.)
 * @returns The inserted queue record
 */
export async function enqueueMetaTx(tipId: string, metaPayload: any) {

  // metaPayload could be { to, amount, cidHash, nonce, from, signature, etc. }
  const { data, error } = await supabase
    .from('meta_tx_queue')
    .insert({
      tip_id: tipId,
      payload: metaPayload,
      status: 'queued',
      priority: metaPayload.priority || 100
    } as any)
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
    detail: { queue_id: (data as any)?.id, priority: (data as any)?.priority }
  } as any);

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

  const updateData: Record<string, any> = { status };
  if (error) {
    updateData.payload = { ...updateData.payload, error };
  }

  // @ts-ignore - Supabase types don't properly infer table schema
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

