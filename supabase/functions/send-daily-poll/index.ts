import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData?.user) {
      console.error('Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('User is not admin:', userData.user.id);
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Admin authenticated:', userData.user.id);

    const apiKey = Deno.env.get('WASENDER_API_KEY');
    if (!apiKey) {
      throw new Error('WASENDER_API_KEY not configured');
    }

    // Get configuration from app_settings
    const { data: settings } = await supabaseAdmin
      .from('app_settings')
      .select('key, value')
      .in('key', ['wasender_session_id', 'wasender_group_jid']);

    const settingsMap = new Map(settings?.map(s => [s.key, s.value]) || []);
    
    const sessionId = settingsMap.get('wasender_session_id') || Deno.env.get('WASENDER_SESSION_ID') || '43477';
    const groupJid = settingsMap.get('wasender_group_jid') || Deno.env.get('WASENDER_GROUP_JID');

    if (!groupJid) {
      throw new Error('WhatsApp group JID not configured. Please set wasender_group_jid in app_settings.');
    }

    // Get current date formatted
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }).replace(/\//g, '/');

    // Create the poll message
    const pollData = {
      to: groupJid,
      poll: {
        question: `📝 Daily Guide Report ✅ Activity ${dateStr}`,
        options: [
          "☎️ Customer Contacted (Confirm)",
          "🚐 Departure to camp",
          "🏡 Start Visit to Argan Cooperative",
          "🏍️ Start Quad Biking Session",
          "🐪 Start Camel Ride",
          "🍽️ Dinner",
          "🎉 Start Fire Show & Entertainment",
          "🚐 Return to Meeting Point"
        ],
        multiSelect: true
      }
    };

    console.log('Sending poll to group:', groupJid);

    // Send poll using WasenderAPI
    const response = await fetch(`https://wasenderapi.com/api/send-message?session=${sessionId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pollData),
    });

    const data = await response.json();
    
    console.log('WasenderAPI response status:', response.status);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send poll');
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Poll sent successfully',
      data: data,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending poll:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
