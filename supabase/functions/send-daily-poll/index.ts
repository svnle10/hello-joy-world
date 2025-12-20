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
    const groupJid = '120363404527392537@g.us'; // Morocco guide smile

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
    console.log('Poll data:', JSON.stringify(pollData));

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
    
    console.log('WasenderAPI response:', JSON.stringify(data));

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
