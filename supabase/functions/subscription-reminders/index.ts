import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Calculate the target date (3 days from now)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    
    // Create a window (between 3 days and 4 days from now)
    const startDate = new Date(targetDate.setHours(0,0,0,0)).toISOString();
    const endDate = new Date(targetDate.setHours(23,59,59,999)).toISOString();

    console.log(`Checking for subscriptions expiring between ${startDate} and ${endDate}`);

    // 2. Fetch subscriptions expiring in that window
    const { data: subs, error } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        id,
        expires_at,
        profiles (
          email
        )
      `)
      .gte('expires_at', startDate)
      .lte('expires_at', endDate);

    if (error) throw error;

    console.log(`Found ${subs?.length || 0} subscriptions to remind.`);

    // 3. Send emails via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('RESEND_API_KEY not found');

    const results = [];
    for (const sub of (subs || [])) {
      const email = sub.profiles?.email;
      if (!email) continue;

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'CodeVault <support@resend.dev>',
          to: [email],
          subject: 'Your CodeVault Access is Expiring Soon!',
          html: `
            <div style="font-family: sans-serif; background: #080b12; color: #f0f2ff; padding: 40px; border-radius: 12px;">
              <h1 style="color: #6366f1;">⬡ CodeVault</h1>
              <h2>Your access expires in 3 days!</h2>
              <p>We wanted to let you know that your Pro Access to the source code will expire on <strong>${new Date(sub.expires_at).toLocaleDateString()}</strong>.</p>
              <p>To keep your access and see the latest updates, you can renew your subscription anytime.</p>
              <hr style="border: none; border-top: 1px solid #161c2d; margin: 20px 0;" />
              <a href="https://ncgggxtmnxftsmynwnyr.supabase.co/functions/v1/viewer#pricing" 
                 style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px;">
                 Renew My Access
              </a>
            </div>
          `,
        }),
      });
      
      const data = await emailResponse.json();
      results.push({ email, status: data });
    }

    return new Response(
      JSON.stringify({ message: 'Reminders processed', results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err) {
    console.error('Reminder Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
