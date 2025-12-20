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

    // Delete all existing users first
    const usersToDelete = [
      "78808b36-11f6-4255-8369-4b5218a9743a", // old admin
      "1527be86-585b-4ffd-9980-caf489c3a5c7",
      "63f0d916-0f46-4169-991d-381b0620ac5a",
      "c4a84f97-9656-48c2-84a1-9a7ec93f04f0",
      "39de23af-ff7f-4f2d-b830-5efc9dd62e29",
      "7cff174c-acef-42f0-9eb3-508618fe791f",
      "c2152d92-e9a1-44fc-a9cb-9baba9846a80",
      "0f9938c2-e894-4348-b5cc-5644757a147d",
      "134b89ff-ddca-4d3e-93e1-96f3ac311231",
      "ce508456-7746-4a52-be00-4f4557204e50",
      "15c92a27-2d22-4ca7-9deb-5596c23a2ab4",
      "f9b1ec21-d87e-41ef-aeb9-730eb93958bd",
      "60d2e42b-e1b7-42be-b81e-635a4f4f3d92",
      "a00f0b0f-c57e-48b5-94bf-4f0ecd11072e",
      "554fea56-30d9-4296-bdbf-d7231eb283ef",
      "13d7d586-a069-46ff-8b64-f4c1bcb4b212",
      "0ab59049-50de-4a65-a852-60927a2925a7",
      "086dadf3-e289-4e21-91a2-d762472c1125",
      "d0cd0f0a-305d-4986-beaf-de664aa66832",
      "73e41c9c-f3ee-4ce3-95a8-a224bf1e468b",
      "627f29bd-6b8b-40de-93fb-7ed02701fcb1",
      "eeb94cbd-829b-403b-ada4-bdb03edd87ab",
      "e08c202c-af10-4157-9e62-34db13c9d850",
      "92622ea6-7e58-46ca-b9c9-1b5f3e1d18f4",
    ];

    for (const userId of usersToDelete) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.log("Deleted user:", userId);
      } catch (e) {
        console.log("Could not delete user:", userId);
      }
    }

    // Create admin user
    const adminEmail = "mohammedbouisoukoutane@gmail.com";
    const adminPassword = "mohammed1010";

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "مدير النظام" },
    });

    if (createError) {
      // User might already exist
      if (createError.message.includes("already")) {
        return new Response(JSON.stringify({ 
          message: "Admin already exists",
          email: adminEmail,
          password: adminPassword
        }), {
          status: 200,
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

    return new Response(JSON.stringify({ 
      success: true, 
      email: adminEmail,
      password: adminPassword,
      user_id: userData.user.id
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error creating admin:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});