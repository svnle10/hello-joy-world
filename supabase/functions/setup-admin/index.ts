import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// WARNING: This is a setup function that should only be run once during initial setup.
// After setup, consider deleting or disabling this function.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body for credentials
    const body = await req.json().catch(() => ({}));
    const adminEmail = body.email;
    const adminPassword = body.password;

    if (!adminEmail || !adminPassword) {
      return new Response(JSON.stringify({ 
        error: "Email and password are required in the request body",
        usage: "POST with JSON body: { \"email\": \"admin@example.com\", \"password\": \"your-secure-password\" }"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate password strength
    if (adminPassword.length < 12) {
      return new Response(JSON.stringify({ 
        error: "Password must be at least 12 characters long" 
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

    // Check if admin already exists
    const { data: existingRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (existingRoles && existingRoles.length > 0) {
      return new Response(JSON.stringify({ 
        error: "An admin already exists. Use password reset to change credentials.",
        hint: "Use Supabase auth password reset functionality"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "مدير النظام" },
    });

    if (createError) {
      if (createError.message.includes("already")) {
        return new Response(JSON.stringify({ 
          error: "This email is already registered",
          hint: "Use a different email or reset the password"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw createError;
    }

    // Add admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userData.user.id, role: "admin" });

    if (roleError) {
      console.error("Role assignment error:", roleError);
    }

    console.log("Admin created successfully:", userData.user.id);

    // Never return password in response
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Admin account created successfully. Please login with your credentials.",
      user_id: userData.user.id
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error creating admin:", error.message);
    return new Response(JSON.stringify({ error: "Failed to create admin account" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
