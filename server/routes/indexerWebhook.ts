import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

const router = express.Router();

const url = process.env.SUPABASE_URL || config.SUPABASE?.URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE?.SERVICE_ROLE_KEY || '';

if (!url || !serviceKey) {
  console.warn('Supabase service role key not configured. Indexer webhook will fail.');
}

const supabase = createClient(url, serviceKey, { 
  auth: { persistSession: false } 
});

/**
 * Webhook endpoint called by chain indexer when a transaction is mined/confirmed
 * 
 * Expected body:
 * {
 *   tipId: 'uuid',
 *   txHash: '0x...',
 *   confirmations: 1,
 *   status: 'confirmed' | 'submitted'
 * }
 * 
 * Security: Always validate incoming requests (signature from indexer) before writing
 */
router.post('/indexer/webhook', async (req: Request, res: Response) => {
  try {
    // TODO: Add signature verification here
    // const signature = req.headers['x-indexer-signature'];
    // if (!verifySignature(req.body, signature)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    const { tipId, txHash, confirmations, status } = req.body;

    if (!tipId || !txHash) {
      return res.status(400).json({ error: 'Missing required fields: tipId, txHash' });
    }

    // Idempotent update: ensure status changes only once from pending->submitted->confirmed
    // Use SQL to ensure atomicity and prevent duplicate confirmations
    const { data: tipData, error: tipError } = await supabase
      .rpc('update_tip_confirmation', {
        p_tip_id: tipId,
        p_tx_hash: txHash,
        p_confirmations: confirmations || 1,
        p_status: status || 'confirmed'
      });

    // If RPC doesn't exist, fall back to direct update
    if (tipError && tipError.message?.includes('function') && tipError.message?.includes('does not exist')) {
      // Fallback: direct update with idempotency check
      const { data: existingTip } = await supabase
        .from('tips')
        .select('status, confirmations')
        .eq('id', tipId)
        .single();

      if (existingTip) {
        // Only update if status is progressing forward
        const statusOrder = { pending: 0, submitted: 1, confirmed: 2, failed: -1 };
        const currentStatus = statusOrder[existingTip.status as keyof typeof statusOrder] || 0;
        const newStatus = statusOrder[status as keyof typeof statusOrder] || 0;

        if (newStatus > currentStatus || (status === 'confirmed' && existingTip.status !== 'confirmed')) {
          const { error: updateError } = await supabase
            .from('tips')
            .update({
              relayer_tx_hash: txHash,
              confirmations: Math.max(existingTip.confirmations || 0, confirmations || 1),
              status: status || (confirmations >= 12 ? 'confirmed' : 'submitted')
            })
            .eq('id', tipId);

          if (updateError) {
            console.error('Error updating tip:', updateError);
            return res.status(500).json({ error: 'Failed to update tip' });
          }
        }
      } else {
        return res.status(404).json({ error: 'Tip not found' });
      }
    } else if (tipError) {
      console.error('Error updating tip:', tipError);
      return res.status(500).json({ error: 'Failed to update tip' });
    }

    // Log the webhook event
    await supabase.from('relayer_logs').insert({
      tip_id: tipId,
      action: 'indexer_webhook',
      actor: 'indexer',
      detail: { txHash, confirmations, status }
    });

    res.json({ ok: true, tipId, txHash });
  } catch (e: any) {
    console.error('Indexer webhook error:', e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

export default router;

