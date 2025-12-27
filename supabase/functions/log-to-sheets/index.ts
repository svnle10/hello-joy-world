import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate webhook URL to prevent SSRF attacks
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }
    
    // Block internal/private IPs
    const hostname = parsed.hostname.toLowerCase();
    const blockedPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '10.',
      '172.16.', '172.17.', '172.18.', '172.19.',
      '172.20.', '172.21.', '172.22.', '172.23.',
      '172.24.', '172.25.', '172.26.', '172.27.',
      '172.28.', '172.29.', '172.30.', '172.31.',
      '192.168.',
      '169.254.',
      '.local',
      '.internal',
    ];
    
    for (const pattern of blockedPatterns) {
      if (hostname.includes(pattern) || hostname.startsWith(pattern)) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify they're authenticated
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await req.json();
    const { action, data } = body;

    if (!action || !data) {
      return new Response(JSON.stringify({ error: "Missing action or data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use admin client to read webhook URLs (guides can't read these directly anymore)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Determine which webhook to use
    const webhookKey = action === 'delete' ? 'sheets_delete_webhook_url' : 'sheets_webhook_url';
    
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', webhookKey)
      .single();

    if (settingsError || !settings?.value) {
      console.log(`Webhook not configured for action: ${action}`);
      return new Response(JSON.stringify({ success: false, message: "Webhook not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookUrl = settings.value;

    // Validate webhook URL (SSRF protection)
    if (!isValidWebhookUrl(webhookUrl)) {
      console.error("Invalid webhook URL detected");
      return new Response(JSON.stringify({ error: "Invalid webhook configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Forward to webhook
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      console.log(`Event logged to Google Sheets: ${action}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (fetchError) {
      console.error("Error calling webhook:", fetchError);
      return new Response(JSON.stringify({ success: false, message: "Webhook call failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: any) {
    console.error("Error in log-to-sheets function:", error.message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
