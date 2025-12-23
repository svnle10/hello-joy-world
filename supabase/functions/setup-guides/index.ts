import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// WARNING: This is a setup function that should only be run once during initial setup.
// Webhook URLs and credentials should be managed through the admin panel.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body for guide data
    const body = await req.json().catch(() => ({}));
    const guides = body.guides;
    const defaultPassword = body.password;

    if (!guides || !Array.isArray(guides) || guides.length === 0) {
      return new Response(JSON.stringify({ 
        error: "Guides array is required",
        usage: "POST with JSON body: { \"guides\": [{ \"name\": \"Guide Name\", \"email\": \"guide@example.com\", \"webhook\": \"https://...\" }], \"password\": \"secure-password\" }"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!defaultPassword || defaultPassword.length < 10) {
      return new Response(JSON.stringify({ 
        error: "Password is required and must be at least 10 characters" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results: any[] = [];

    for (const guide of guides) {
      if (!guide.email || !guide.name) {
        results.push({ name: guide.name || 'Unknown', status: "error", error: "Missing name or email" });
        continue;
      }

      try {
        // Create user
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: guide.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: { full_name: guide.name },
        });

        if (createError) {
          if (createError.message.includes("already")) {
            // User exists, just update webhook if provided
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === guide.email);
            
            if (existingUser && guide.webhook) {
              await supabaseAdmin
                .from("profiles")
                .update({ webhook_url: guide.webhook })
                .eq("user_id", existingUser.id);
              
              results.push({ name: guide.name, status: "updated", email: guide.email });
            } else {
              results.push({ name: guide.name, status: "exists", email: guide.email });
            }
            continue;
          }
          throw createError;
        }

        // Update profile with webhook URL if provided
        if (guide.webhook) {
          await supabaseAdmin
            .from("profiles")
            .update({ webhook_url: guide.webhook })
            .eq("user_id", userData.user.id);
        }

        // Add guide role
        await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userData.user.id, role: "guide" });

        results.push({ 
          name: guide.name, 
          status: "created", 
          email: guide.email
          // Password NOT returned in response
        });
      } catch (error: any) {
        results.push({ name: guide.name, status: "error", error: error.message });
      }
    }

    console.log("Setup completed. Created:", results.filter(r => r.status === 'created').length);

    // Never return password in response
    return new Response(JSON.stringify({ 
      success: true, 
      results,
      message: `Processed ${results.length} guides. Please share the password securely with the guides.`,
      summary: {
        created: results.filter(r => r.status === 'created').length,
        updated: results.filter(r => r.status === 'updated').length,
        exists: results.filter(r => r.status === 'exists').length,
        errors: results.filter(r => r.status === 'error').length,
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error setting up guides:", error.message);
    return new Response(JSON.stringify({ error: "Failed to setup guides" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
