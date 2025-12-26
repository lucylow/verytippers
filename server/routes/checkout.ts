import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || config.SUPABASE?.URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE?.SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase credentials not configured. Checkout endpoints will fail.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Initialize Redis (optional, for queue)
let redis: any = null;
try {
  const Redis = require('ioredis');
  const redisUrl = process.env.REDIS_URL || config.REDIS_URL || 'redis://localhost:6379';
  redis = new Redis(redisUrl);
  console.log('✅ Redis connected for checkout queue');
} catch (err) {
  console.warn('⚠️  Redis not available, using database queue only');
}

/**
 * Create Stripe checkout session to buy credits
 * POST /api/checkout/stripe-create-session
 */
router.post('/stripe-create-session', async (req: Request, res: Response) => {
  try {
    const { userId, credits, success_url, cancel_url } = req.body;

    if (!userId || !credits || credits <= 0) {
      return res.status(400).json({ error: 'userId and credits (positive number) are required' });
    }

    // Define credit pricing: 1 credit = $0.01 (100 credits = $1.00)
    const amountCents = Math.round(Number(credits) * 100 / 100); // 1 credit = 1 cent

    if (!stripe || !process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { 
            name: `${credits} VERY Credits`,
            description: 'Credits for tipping on VeryTippers'
          },
          unit_amount: amountCents,
        },
        quantity: 1
      }],
      success_url: success_url || `${req.headers.origin || 'http://localhost:5173'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${req.headers.origin || 'http://localhost:5173'}/checkout/cancel`,
      metadata: { 
        userId: String(userId), 
        credits: String(credits) 
      }
    });

    // Store order in database
    const { error: orderError } = await supabase.from('orders').insert({
      user_id: userId,
      amount_cents: amountCents,
      credits: Number(credits),
      stripe_session_id: session.id,
      status: 'pending'
    });

    if (orderError) {
      console.error('Error storing order:', orderError);
      // Don't fail the request, but log it
    }

    res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('Error creating Stripe session:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

/**
 * Stripe webhook to finalize order and credit user balance
 * POST /api/checkout/stripe-webhook
 * Note: Raw body middleware is configured at app level for this route
 */
router.post('/stripe-webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (!webhookSecret) {
    console.error('⚠️  STRIPE_WEBHOOK_SECRET not configured');
    return res.status(400).send('Webhook secret not configured');
  }

  let event: Stripe.Event;

  try {
    // Raw body is available because middleware is configured at app level
    const rawBody = (req as any).rawBody || req.body;
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const credits = Number(session.metadata?.credits) || 0;

    if (!userId || !credits) {
      console.error('Missing userId or credits in session metadata');
      return res.status(400).json({ error: 'Invalid session metadata' });
    }

    try {
      // Mark order as paid
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('stripe_session_id', session.id);

      if (updateError) {
        console.error('Error updating order:', updateError);
      }

      // Credit user's balance: upsert
      const { data: existing } = await supabase
        .from('balances')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existing) {
        const { error: balanceError } = await supabase
          .from('balances')
          .update({ 
            credits: Number(existing.credits) + credits, 
            updated_at: new Date().toISOString() 
          })
          .eq('user_id', userId);

        if (balanceError) {
          console.error('Error updating balance:', balanceError);
          return res.status(500).json({ error: 'Failed to credit balance' });
        }
      } else {
        const { error: insertError } = await supabase
          .from('balances')
          .insert({ 
            user_id: userId, 
            credits: credits,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating balance:', insertError);
          return res.status(500).json({ error: 'Failed to create balance' });
        }
      }

      console.log(`✅ Credited ${credits} credits to user ${userId}`);
    } catch (err: any) {
      console.error('Error processing webhook:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  res.json({ received: true });
});

/**
 * Create meta-tx endpoint (user tipping with credits)
 * POST /api/checkout/create-meta-tx
 */
router.post('/create-meta-tx', async (req: Request, res: Response) => {
  try {
    const { userId, toAddress, amount, cid, nonceHint, fromAddress, signature } = req.body;

    if (!userId || !toAddress || !amount || amount <= 0) {
      return res.status(400).json({ error: 'userId, toAddress, and amount (positive) are required' });
    }

    // Policy checks: ensure user has sufficient credits
    const { data: balance, error: balanceError } = await supabase
      .from('balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (balanceError || !balance) {
      return res.status(404).json({ error: 'User balance not found' });
    }

    if (Number(balance.credits) < Number(amount)) {
      return res.status(402).json({ 
        error: 'Insufficient credits',
        available: balance.credits,
        required: amount
      });
    }

    // Decrement credits atomically (basic approach - for production use transactions)
    const newCredits = Number(balance.credits) - Number(amount);
    const { error: updateError } = await supabase
      .from('balances')
      .update({ 
        credits: newCredits, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error decrementing credits:', updateError);
      return res.status(500).json({ error: 'Failed to debit credits' });
    }

    // Generate nonce if not provided
    const nonce = nonceHint || Math.floor(Date.now() / 1000);

    // Insert into meta_tx_queue
    const { data: queueData, error: queueError } = await supabase
      .from('meta_tx_queue')
      .insert({
        user_id: userId,
        to_address: toAddress,
        amount: Number(amount),
        cid: cid || null,
        nonce: nonce,
        status: 'queued',
        payload: {
          fromAddress: fromAddress || null,
          signature: signature || null,
          createdAt: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (queueError) {
      console.error('Error enqueueing meta-tx:', queueError);
      // Rollback credit deduction (simplified - use transactions in production)
      await supabase
        .from('balances')
        .update({ credits: balance.credits, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      return res.status(500).json({ error: 'Failed to enqueue meta-tx' });
    }

    // Also push to Redis queue for relayer (optional)
    if (redis) {
      try {
        await redis.lpush('metaTxQueue', JSON.stringify({ id: queueData.id }));
      } catch (redisErr) {
        console.warn('Redis push failed (non-critical):', redisErr);
      }
    }

    res.json({ 
      queuedId: queueData.id,
      message: 'Meta-transaction queued for relayer processing'
    });
  } catch (error: any) {
    console.error('Error creating meta-tx:', error);
    res.status(500).json({ error: error.message || 'Failed to create meta-tx' });
  }
});

/**
 * Get user balance
 * GET /api/checkout/balance/:userId
 */
router.get('/balance/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.json({ credits: 0, userId });
    }

    res.json({ credits: data.credits, userId: data.user_id });
  } catch (error: any) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user orders
 * GET /api/checkout/orders/:userId
 */
router.get('/orders/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ orders: data || [] });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

