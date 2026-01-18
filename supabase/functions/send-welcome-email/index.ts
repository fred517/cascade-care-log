import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  userId: string;
  email: string;
  firstName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { userId, email, firstName }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to: ${email} (${userId})`);

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Generate a password reset link (magic link for setting password)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://waterops.lovable.app/reset-password',
      }
    });

    if (linkError) {
      console.error("Error generating recovery link:", linkError);
      throw new Error(`Failed to generate password link: ${linkError.message}`);
    }

    const passwordSetupLink = linkData.properties.action_link;
    console.log("Generated password setup link for user");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; }
          .content { background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
          .welcome-box { background: white; padding: 20px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #22c55e; }
          .footer { padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
          .btn { display: inline-block; background: #22c55e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
          .steps { margin: 20px 0; }
          .step { display: flex; margin-bottom: 12px; }
          .step-number { background: #22c55e; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; margin-right: 12px; flex-shrink: 0; }
          .step-text { color: #334155; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🎉 Welcome to WaterOps!</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Your account has been approved</p>
          </div>
          <div class="content">
            <p>Hi ${firstName || 'there'},</p>
            <p>Great news! Your WaterOps account has been approved and is ready to use.</p>
            
            <div class="welcome-box">
              <p style="font-weight: 600; margin-bottom: 12px;">To get started:</p>
              <div class="steps">
                <div class="step">
                  <span class="step-number">1</span>
                  <span class="step-text">Click the button below to set your password</span>
                </div>
                <div class="step">
                  <span class="step-number">2</span>
                  <span class="step-text">Create a secure password for your account</span>
                </div>
                <div class="step">
                  <span class="step-number">3</span>
                  <span class="step-text">Sign in and start monitoring your facility</span>
                </div>
              </div>
            </div>
            
            <p style="text-align: center; margin-top: 24px;">
              <a href="${passwordSetupLink}" class="btn">Set Your Password</a>
            </p>

            <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
              This link will expire in 24 hours. If you need a new link, use the "Forgot Password" option on the sign-in page.
            </p>
          </div>
          <div class="footer">
            <p>If you have any questions, contact us at fred@ecura.com.au</p>
            <p>© WaterOps - Modern Wastewater Management</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "WaterOps <onboarding@resend.dev>",
      to: [email],
      subject: "🎉 Welcome to WaterOps - Set Your Password",
      html,
    });

    console.log("Welcome email sent:", emailResponse);

    // Log the email
    await supabase.from("email_logs").insert({
      recipient_email: email,
      recipient_name: firstName || email,
      subject: "Welcome to WaterOps - Set Your Password",
      body: html,
      status: "sent",
      provider_id: emailResponse.data?.id,
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);