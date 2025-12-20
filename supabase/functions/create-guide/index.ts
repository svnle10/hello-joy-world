import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const { action } = body;

    // Handle delete action
    if (action === "delete") {
      const { user_id } = body;
      
      if (!user_id) {
        throw new Error("Missing user_id for delete action");
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

    console.log("Creating guide:", email);

    // Create user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
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
        .eq("user_id", userData.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }
    }

    // Add guide role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userData.user.id, role: "guide" });

    if (roleError) {
      console.error("Role assignment error:", roleError);
    }

    console.log("Guide created successfully:", userData.user.id);

    return new Response(JSON.stringify({ success: true, user: userData.user }), {
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
