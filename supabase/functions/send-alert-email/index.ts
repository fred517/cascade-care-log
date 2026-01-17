import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AlertEmailRequest {
  alertEventId: string;
  metricName: string;
  metricId: string;
  value: number;
  unit: string;
  thresholdMin?: number;
  thresholdMax?: number;
  severity: string;
  siteName?: string;
  triggeredAt: string;
  playbook?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create client with user's auth
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate the JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Invalid token:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated user: ${userId}`);

    // Use service role for database operations (needed for email sending)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const alertData: AlertEmailRequest = await req.json();

    // Get all active email recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from("email_recipients")
      .select("*")
      .eq("is_active", true);

    if (recipientsError) {
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active recipients configured" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Determine violation type
    let violationType = "";
    if (alertData.thresholdMin !== undefined && alertData.value < alertData.thresholdMin) {
      violationType = `below minimum (${alertData.thresholdMin} ${alertData.unit})`;
    } else if (alertData.thresholdMax !== undefined && alertData.value > alertData.thresholdMax) {
      violationType = `above maximum (${alertData.thresholdMax} ${alertData.unit})`;
    }

    const severityColor = alertData.severity === "critical" ? "#ef4444" : "#f59e0b";
    const severityLabel = alertData.severity === "critical" ? "CRITICAL" : "WARNING";

    const emailResults = [];

    for (const recipient of recipients) {
      const subject = `[${severityLabel}] ${alertData.siteName || "Site"}: ${alertData.metricName} ${violationType}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; }
            .metric-box { background: white; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid ${severityColor}; }
            .metric-value { font-size: 32px; font-weight: bold; color: ${severityColor}; }
            .metric-label { color: #64748b; font-size: 14px; }
            .playbook { background: #f0f9ff; padding: 16px; border-radius: 8px; margin-top: 16px; border: 1px solid #0ea5e9; }
            .playbook h3 { color: #0369a1; margin-top: 0; }
            .footer { padding: 16px; text-align: center; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">⚠️ ${severityLabel} Alert</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">${alertData.siteName || "Wastewater Plant"}</p>
            </div>
            <div class="content">
              <p>Hello ${recipient.name},</p>
              <p>A threshold violation has been detected that requires your attention:</p>
              
              <div class="metric-box">
                <div class="metric-label">${alertData.metricName}</div>
                <div class="metric-value">${alertData.value} ${alertData.unit}</div>
                <div class="metric-label" style="margin-top: 8px;">
                  ${violationType}
                </div>
              </div>

              <p><strong>Triggered:</strong> ${new Date(alertData.triggeredAt).toLocaleString()}</p>
              
              ${alertData.thresholdMin !== undefined || alertData.thresholdMax !== undefined ? `
              <p><strong>Operating Range:</strong> ${alertData.thresholdMin ?? "N/A"} - ${alertData.thresholdMax ?? "N/A"} ${alertData.unit}</p>
              ` : ""}

              ${alertData.playbook ? `
              <div class="playbook">
                <h3>🔧 Recommended Actions</h3>
                <div>${alertData.playbook}</div>
              </div>
              ` : ""}
            </div>
            <div class="footer">
              <p>This is an automated alert from WaterOps</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: "WaterOps Alerts <onboarding@resend.dev>",
          to: [recipient.email],
          subject,
          html,
        });

        // Log successful email
        await supabase.from("email_logs").insert({
          alert_event_id: alertData.alertEventId,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          subject,
          body: html,
          status: "sent",
          provider_id: emailResponse.data?.id,
          sent_at: new Date().toISOString(),
        });

        emailResults.push({ email: recipient.email, status: "sent" });
      } catch (emailError: any) {
        // Log failed email
        await supabase.from("email_logs").insert({
          alert_event_id: alertData.alertEventId,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          subject,
          status: "failed",
          fail_reason: emailError.message,
        });

        emailResults.push({ email: recipient.email, status: "failed", error: emailError.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results: emailResults }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-alert-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);