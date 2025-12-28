import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogRequest {
  type: 'daily_report' | 'email_log' | 'issue' | 'unavailability' | 'group' | 'booking' | 'assignment' | 'user_login';
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
}

const WEBHOOK_KEY_MAP: Record<string, string> = {
  daily_report: 'webhook_daily_reports',
  email_log: 'webhook_email_logs',
  issue: 'webhook_issues',
  unavailability: 'webhook_guide_unavailability',
  group: 'webhook_groups',
  booking: 'webhook_bookings',
  assignment: 'webhook_daily_assignments',
  user_login: 'webhook_user_logins',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: LogRequest = await req.json();
    const { type, action, data } = body;

    console.log(`Processing ${action} for ${type}:`, data);

    // Get webhook URL from app_settings
    const webhookKey = WEBHOOK_KEY_MAP[type];
    if (!webhookKey) {
      console.error('Unknown type:', type);
      return new Response(JSON.stringify({ error: 'Unknown type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: setting, error: settingError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', webhookKey)
      .maybeSingle();

    if (settingError) {
      console.error('Error fetching webhook URL:', settingError);
      return new Response(JSON.stringify({ error: 'Failed to fetch webhook URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const webhookUrl = setting?.value;
    if (!webhookUrl) {
      console.log(`No webhook configured for ${type}`);
      return new Response(JSON.stringify({ success: true, message: 'No webhook configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate webhook URL
    try {
      const url = new URL(webhookUrl);
      if (url.protocol !== 'https:') {
        console.error('Invalid webhook URL protocol');
        return new Response(JSON.stringify({ error: 'Webhook URL must use HTTPS' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch {
      console.error('Invalid webhook URL format');
      return new Response(JSON.stringify({ error: 'Invalid webhook URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send to n8n webhook
    console.log(`Sending to webhook: ${webhookUrl}`);
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        timestamp: new Date().toISOString(),
        ...data,
      }),
    });

    if (!webhookResponse.ok) {
      console.error('Webhook error:', webhookResponse.status, await webhookResponse.text());
      return new Response(JSON.stringify({ error: 'Webhook call failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Webhook call successful');
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in log-to-n8n:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
