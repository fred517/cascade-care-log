import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = "fred@ecura.com.au";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SignupNotificationRequest {
  userId: string;
  email: string;
  displayName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { userId, email, displayName }: SignupNotificationRequest = await req.json();

    console.log(`New signup notification for: ${email} (${userId})`);

    const approvalUrl = `${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}/settings`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; }
          .content { background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
          .user-box { background: white; padding: 20px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6; }
          .footer { padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
          .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🆕 New User Registration</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Approval Required</p>
          </div>
          <div class="content">
            <p>Hello Admin,</p>
            <p>A new user has registered and is waiting for approval:</p>
            
            <div class="user-box">
              <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0 0 8px 0;"><strong>Display Name:</strong> ${displayName || 'Not provided'}</p>
              <p style="margin: 0;"><strong>User ID:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${userId}</code></p>
            </div>

            <p>This user will not be able to access the application until you approve their account.</p>
            
            <p style="text-align: center; margin-top: 24px;">
              <a href="${approvalUrl}" class="btn">Review & Approve User</a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from WaterOps</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "WaterOps <onboarding@resend.dev>",
      to: [ADMIN_EMAIL],
      subject: `🆕 New User Awaiting Approval: ${email}`,
      html,
    });

    console.log("Notification sent to admin:", emailResponse);

    // Log the email
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from("email_logs").insert({
      recipient_email: ADMIN_EMAIL,
      recipient_name: "Admin",
      subject: `New User Awaiting Approval: ${email}`,
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
    console.error("Error in send-signup-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);