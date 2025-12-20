import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const guides = [
  { name: "Abdel", email: "abdel@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/d31883af-095c-43eb-b3e8-2a7c31e8f84b" },
  { name: "AbdelHaq Pika", email: "abdelhaq.pika@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/d9df4959-0abb-4284-80cd-8cbe379ec3e6" },
  { name: "Abdessadek", email: "abdessadek@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/1a4e09da-4e65-432e-96db-fe695c0112c6" },
  { name: "Achraf", email: "achraf@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/283a0a90-b343-431a-8753-b9cf172c495d" },
  { name: "Omar Adnan", email: "omar.adnan@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/cb35b717-7821-4676-af7c-500f7f9e8abb" },
  { name: "Ahmed", email: "ahmed@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/0ba65111-2e84-467e-8b9e-e781449a7826" },
  { name: "Ali", email: "ali@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/92c70dc9-2150-4e46-a34b-6df90ef77490" },
  { name: "Aya", email: "aya@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/1f28ff22-1b82-4c7b-89fb-517cd5128a85" },
  { name: "Ayoub", email: "ayoub@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/eef24bbb-0841-410d-b8c6-1610eb1581a6" },
  { name: "Ayoub Oumloul", email: "ayoub.oumloul@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/a495ae32-7fc8-4f51-b28a-ee6c26cfac4a" },
  { name: "Brahim", email: "brahim@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/8acfff52-e56f-426d-8690-8d1ca9942252" },
  { name: "Brahim Ousous", email: "brahim.ousous@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/73df732f-f161-4ce3-a916-75aadca40700" },
  { name: "Fatima", email: "fatima@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/984ee8af-aa3d-4741-8853-0c7e0ee46dd1" },
  { name: "Hamza", email: "hamza@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/ead299b0-9a1e-4fb1-baf2-e4bd0b633d6e" },
  { name: "Hicham", email: "hicham@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/5a169798-2ecd-42df-8a43-f6442e9e5a19" },
  { name: "Jihane", email: "jihane@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/5ee40d32-19da-4a9f-8029-cf287c559f21" },
  { name: "Omar", email: "omar@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/938a2f1c-21ab-4c52-ac3a-4f17c56ff82c" },
  { name: "Rida", email: "rida@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/782b2080-072d-48c5-a5e4-a8aea6c3e26f" },
  { name: "Yassine", email: "yassine@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/d9dd7488-1c1c-4c0f-bcd7-dc96ba9dd143" },
  { name: "Youssef", email: "youssef@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/b0832775-a848-4c97-a04e-cb9fab5a3367" },
  { name: "Zakia", email: "zakia@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/2ddfb6f7-850a-4382-a0b2-4e00ae3d4e1d" },
  { name: "Zineb", email: "zineb@sunskycamp.com", webhook: "https://n8n.srv1179760.hstgr.cloud/form/51d705b4-4dad-480d-a22e-889599548dc0" },
];

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

    const results: any[] = [];
    const defaultPassword = "Guide123!";

    for (const guide of guides) {
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
            // User exists, just update webhook
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === guide.email);
            
            if (existingUser) {
              await supabaseAdmin
                .from("profiles")
                .update({ webhook_url: guide.webhook })
                .eq("user_id", existingUser.id);
              
              results.push({ name: guide.name, status: "updated", email: guide.email });
            }
            continue;
          }
          throw createError;
        }

        // Update profile with webhook URL
        await supabaseAdmin
          .from("profiles")
          .update({ webhook_url: guide.webhook })
          .eq("user_id", userData.user.id);

        // Add guide role
        await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userData.user.id, role: "guide" });

        results.push({ 
          name: guide.name, 
          status: "created", 
          email: guide.email,
          password: defaultPassword 
        });
      } catch (error: any) {
        results.push({ name: guide.name, status: "error", error: error.message });
      }
    }

    console.log("Setup completed:", results);

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      defaultPassword,
      message: "All guides created with password: " + defaultPassword
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error setting up guides:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});