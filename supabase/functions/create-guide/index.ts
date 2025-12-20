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
    
    // Only allow HTTPS
    if (parsed.protocol !== "https:") {
      console.log("Invalid protocol:", parsed.protocol);
      return false;
    }
    
    // Block localhost and internal IP ranges
    const hostname = parsed.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^0\./,
      /^169\.254\./,
      /^\[::1\]$/,
      /^\[fe80:/i,
      /^\[fc00:/i,
      /^\[fd00:/i,
    ];
    
    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) {
        console.log("Blocked hostname pattern:", hostname);
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === AUTHENTICATION CHECK ===
    // Extract and verify the JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Create client with user's token to verify identity
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Verify the user's token
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData.user) {
      console.error("Token verification failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = userData.user.id;
    console.log("Authenticated user:", callerId);

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // === AUTHORIZATION CHECK ===
    // Verify the caller has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Error checking permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!roleData) {
      console.error("User is not admin:", callerId);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin access verified for user:", callerId);

    // === PROCESS REQUEST ===
    const body = await req.json();
    const { action } = body;

    // Handle delete action
    if (action === "delete") {
      const { user_id } = body;
      
      if (!user_id) {
        throw new Error("Missing user_id for delete action");
      }

      // Validate user_id format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user_id)) {
        throw new Error("Invalid user_id format");
      }

      console.log("Deleting user:", user_id);

      // Delete user (this will cascade to profiles and user_roles due to FK constraints)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

      if (deleteError) throw deleteError;

      console.log("User deleted successfully:", user_id);

      return new Response(JSON.stringify({ success: true, message: "User deleted" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle create action (default)
    const { email, password, full_name, webhook_url } = body;

    if (!email || !password || !full_name) {
      throw new Error("Missing required fields: email, password, full_name");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      throw new Error("Invalid email format");
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    // Validate full_name
    if (full_name.length > 100 || full_name.length < 2) {
      throw new Error("Full name must be between 2 and 100 characters");
    }

    // Validate webhook_url if provided
    if (webhook_url && !isValidWebhookUrl(webhook_url)) {
      throw new Error("Invalid webhook URL. Must be HTTPS and not point to internal addresses.");
    }

    console.log("Creating guide:", email);

    // Create user
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) throw createError;

    // Update profile with webhook URL if provided
    if (webhook_url) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ webhook_url })
        .eq("user_id", newUserData.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }
    }

    // Add guide role
    const { error: roleError2 } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserData.user.id, role: "guide" });

    if (roleError2) {
      console.error("Role assignment error:", roleError2);
    }

    console.log("Guide created successfully:", newUserData.user.id);

    return new Response(JSON.stringify({ success: true, user: newUserData.user }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in create-guide function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
