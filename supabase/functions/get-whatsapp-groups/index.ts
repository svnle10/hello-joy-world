import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('WASENDER_API_KEY');
    if (!apiKey) {
      throw new Error('WASENDER_API_KEY not configured');
    }

    const sessionId = '43477';

    console.log('Fetching WhatsApp groups for session:', sessionId);

    // Fetch groups from WasenderAPI
    const response = await fetch(`https://wasenderapi.com/api/groups?session=${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    console.log('WasenderAPI response:', JSON.stringify(data));

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch groups');
    }

    return new Response(JSON.stringify({
      success: true,
      groups: data.groups || data,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching groups:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
