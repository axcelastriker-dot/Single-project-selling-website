import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the user from the authorization header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { payment_id, plan_id } = await req.json();
    if (!payment_id || !plan_id) throw new Error('Missing payment details');

    // Verify with Razorpay
    const rzpKeyId = Deno.env.get('RAZORPAY_KEY_ID') || Deno.env.get('razorpay_key_id');
    const rzpKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') || Deno.env.get('razorpay_key_secret');
    
    if (!rzpKeyId || rzpKeyId.trim() === '' || !rzpKeySecret || rzpKeySecret.trim() === '') {
      throw new Error('Razorpay keys not configured or empty');
    }

    const auth = btoa(`${rzpKeyId}:${rzpKeySecret}`);
    const rzpResponse = await fetch(`https://api.razorpay.com/v1/payments/${payment_id}`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    
    if (!rzpResponse.ok) {
      const errorData = await rzpResponse.text();
      console.error('Razorpay API Error:', errorData);
      throw new Error(`Razorpay API Error: ${rzpResponse.statusText}`);
    }
    
    const payment = await rzpResponse.json();
    
    // Check for captured or authorized status
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      throw new Error(`Payment status is ${payment.status}, not captured or authorized`);
    }

    // Verify amount
    const expectedAmount = plan_id === 'yearly' ? 79900 : 9900;
    if (payment.amount !== expectedAmount) {
      throw new Error('Payment amount mismatch');
    }

    // Insert into DB using Service Role Key (bypasses RLS for the insert)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('supabase_service_role_key');
    if (!serviceRoleKey) throw new Error('Service role key not configured');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    );

    // Calculate new expiry date
    // Check if user has an existing active subscription to extend
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('expires_at')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let startDate = new Date();
    if (existingSub && new Date(existingSub.expires_at) > startDate) {
      startDate = new Date(existingSub.expires_at);
    }

    const expiresAt = new Date(startDate);
    if (plan_id === 'yearly') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_id: plan_id,
        payment_id: payment_id,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      if (insertError.code === '23505') {
        // Unique violation (payment already processed)
        return new Response(
          JSON.stringify({ success: true, message: 'Payment already processed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      console.error('Database Insert Error:', insertError);
      throw new Error(`Database Insert Error: ${insertError.message}`);
    }

    // --- SEND WELCOME EMAIL VIA RESEND ---
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey) {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'CodeVault <onboarding@resend.dev>',
            to: [user.email],
            subject: 'Welcome to CodeVault — Your Access is Ready!',
            html: `
              <div style="font-family: sans-serif; background: #080b12; color: #f0f2ff; padding: 40px; border-radius: 12px;">
                <h1 style="color: #6366f1;">⬡ CodeVault</h1>
                <h2>Welcome to the Vault!</h2>
                <p>Your payment was successful and your <strong>${plan_id}</strong> subscription is now active.</p>
                <p>You can now view the full project source code until: <strong>${expiresAt.toLocaleDateString()}</strong></p>
                <hr style="border: none; border-top: 1px solid #161c2d; margin: 20px 0;" />
                <p style="font-size: 0.8rem; color: #7c84a0;">Payment ID: ${payment_id}</p>
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}.supabase.co/functions/v1/viewer" 
                   style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px;">
                   Open Code Viewer
                </a>
              </div>
            `,
          }),
        });
        
        const emailData = await emailResponse.json();
        console.log('Email sent status:', emailData);
      }
    } catch (emailErr) {
      console.error('Failed to send welcome email:', emailErr);
      // We don't throw here because the payment was already successful in DB
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err) {
    console.error('Edge Function Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
