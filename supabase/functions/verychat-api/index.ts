import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERYLABS_API_URL = 'https://gapi.veryapi.io';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const projectId = Deno.env.get('Project_ID');
    const jwtSecret = Deno.env.get('JWT_Secret');
    const refreshSecret = Deno.env.get('Refresh_Secret');

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'status';

    // Check if configured
    if (!projectId) {
      return new Response(
        JSON.stringify({
          isConfigured: false,
          isHealthy: false,
          error: 'Project_ID secret not configured'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Status check endpoint
    if (action === 'status') {
      try {
        // Attempt to ping the VeryLabs API
        const healthCheck = await fetch(`${VERYLABS_API_URL}/health`, {
          method: 'GET',
          headers: {
            'X-Project-ID': projectId,
            'Authorization': `Bearer ${jwtSecret}`,
            'Content-Type': 'application/json'
          }
        });

        const isHealthy = healthCheck.ok;
        const rateLimitRemaining = healthCheck.headers.get('X-RateLimit-Remaining');

        return new Response(
          JSON.stringify({
            isConfigured: true,
            isHealthy,
            lastCheck: new Date().toISOString(),
            rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined,
            projectId: projectId.substring(0, 8) + '...' // Partial for security
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Health check failed:', error);
        return new Response(
          JSON.stringify({
            isConfigured: true,
            isHealthy: false,
            lastCheck: new Date().toISOString(),
            error: 'Failed to reach VeryLabs API'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Send message endpoint
    if (action === 'send-message') {
      const body = await req.json();
      const { recipientId, message, metadata } = body;

      if (!recipientId || !message) {
        return new Response(
          JSON.stringify({ error: 'recipientId and message are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(`${VERYLABS_API_URL}/v1/messages/send`, {
        method: 'POST',
        headers: {
          'X-Project-ID': projectId,
          'Authorization': `Bearer ${jwtSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient_id: recipientId,
          message,
          metadata
        })
      });

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile endpoint
    if (action === 'get-profile') {
      const userId = url.searchParams.get('userId');
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(`${VERYLABS_API_URL}/v1/users/${userId}`, {
        method: 'GET',
        headers: {
          'X-Project-ID': projectId,
          'Authorization': `Bearer ${jwtSecret}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Tip notification endpoint
    if (action === 'notify-tip') {
      const body = await req.json();
      const { fromUser, toUser, amount, message, txHash } = body;

      const response = await fetch(`${VERYLABS_API_URL}/v1/notifications/tip`, {
        method: 'POST',
        headers: {
          'X-Project-ID': projectId,
          'Authorization': `Bearer ${jwtSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_user: fromUser,
          to_user: toUser,
          amount,
          message,
          tx_hash: txHash
        })
      });

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh token endpoint
    if (action === 'refresh-token') {
      const response = await fetch(`${VERYLABS_API_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'X-Project-ID': projectId,
          'X-Refresh-Secret': refreshSecret || '',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action', availableActions: ['status', 'send-message', 'get-profile', 'notify-tip', 'refresh-token'] }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('VeryChat API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
