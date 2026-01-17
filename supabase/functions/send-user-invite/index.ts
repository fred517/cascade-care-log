import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  name: string;
  role: string;
  invitedBy: string;
  siteUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roleData } = await supabase.rpc('get_user_role', { _user_id: user.id });
    if (roleData !== 'admin') {
      throw new Error("Only admins can invite users");
    }

    const { email, name, role, invitedBy, siteUrl }: InviteRequest = await req.json();

    if (!email || !email.includes('@')) {
      throw new Error("Invalid email address");
    }

    console.log(`Sending invite to ${email} with role ${role}`);

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate signup URL with pre-filled email
    const signupUrl = `${siteUrl}/auth?prefill=${encodeURIComponent(email)}&invited=true`;

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: "Water Ops <onboarding@resend.dev>",
      to: [email],
      subject: "You've been invited to Water Ops",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); border-radius: 12px 12px 0 0;">
                      <div style="width: 60px; height: 60px; background-color: rgba(255,255,255,0.2); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 32px;">💧</span>
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Water Ops</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 16px; color: #18181b; font-size: 20px; font-weight: 600;">
                        Hello${name ? ` ${name}` : ''}! 👋
                      </h2>
                      <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        You've been invited to join <strong>Water Ops</strong> by <strong>${invitedBy}</strong>.
                      </p>
                      
                      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <p style="margin: 0; color: #71717a; font-size: 14px;">
                          <strong style="color: #18181b;">Your assigned role:</strong>
                          <span style="display: inline-block; margin-left: 8px; padding: 4px 12px; background-color: #0ea5e9; color: #ffffff; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
                            ${role}
                          </span>
                        </p>
                      </div>
                      
                      <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        Click the button below to create your account and get started with wastewater monitoring.
                      </p>
                      
                      <a href="${signupUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Create Your Account
                      </a>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px; border-top: 1px solid #e4e4e7; text-align: center;">
                      <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                        If you didn't expect this invitation, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Invite email sent successfully:", emailResponse);

    // Log the email
    await supabase.from('email_logs').insert({
      recipient_email: email,
      recipient_name: name || null,
      subject: "You've been invited to Water Ops",
      status: 'sent',
      sent_at: new Date().toISOString(),
      provider_id: emailResponse.data?.id || null,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation sent to ${email}`,
        emailId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-user-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === "Unauthorized" || error.message === "Only admins can invite users" ? 403 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
