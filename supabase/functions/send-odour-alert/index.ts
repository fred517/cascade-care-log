import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OdourAlertRequest {
  incidentId: string;
  odourType: string;
  intensity: number;
  frequency?: number;
  offensiveness?: number;
  duration?: number;
  locationImpact?: string;
  sourceSuspected?: string;
  windSpeed?: number;
  windDirection?: string;
  temperature?: number;
  incidentAt: string;
  siteName?: string;
}

const ODOUR_TYPE_LABELS: Record<string, string> = {
  septic: "Septic",
  sulfide: "Sulfide (H₂S)",
  ammonia: "Ammonia",
  chemical: "Chemical",
  organic_biological: "Organic/Biological",
  grease_fat: "Grease/Fat",
  earthy_musty: "Earthy/Musty",
  chlorine: "Chlorine",
  solvent: "Solvent",
  fuel_oil: "Fuel/Oil",
  unknown: "Unknown/Other",
};

const INTENSITY_LABELS = ["", "Very Weak", "Weak", "Moderate", "Strong", "Very Strong"];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the JWT token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.log("JWT verification failed:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);

    // Check if user has supervisor or admin role
    const { data: roleData, error: roleError } = await supabaseAuth
      .rpc("get_user_role", { _user_id: userId });

    if (roleError) {
      console.log("Error checking user role:", roleError.message);
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!roleData || !["supervisor", "admin"].includes(roleData)) {
      console.log("User does not have required role:", roleData);
      return new Response(
        JSON.stringify({ error: "Forbidden - supervisor or admin role required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("User authorized with role:", roleData);

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const alertData: OdourAlertRequest = await req.json();
    
    console.log("Processing odour alert for incident:", alertData.incidentId);

    // Only send for high intensity (4-5)
    if (alertData.intensity < 4) {
      return new Response(
        JSON.stringify({ message: "Intensity below threshold, no alert sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all active email recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from("email_recipients")
      .select("*")
      .eq("is_active", true);

    if (recipientsError) {
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    if (!recipients || recipients.length === 0) {
      console.log("No active recipients configured");
      return new Response(
        JSON.stringify({ message: "No active recipients configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const intensityLabel = INTENSITY_LABELS[alertData.intensity] || `Level ${alertData.intensity}`;
    const odourTypeLabel = ODOUR_TYPE_LABELS[alertData.odourType] || alertData.odourType;
    const severityColor = alertData.intensity >= 5 ? "#ef4444" : "#f59e0b";
    const severityLabel = alertData.intensity >= 5 ? "CRITICAL" : "HIGH";

    const emailResults = [];

    for (const recipient of recipients) {
      const subject = `[${severityLabel} ODOUR] ${alertData.siteName || "Site"}: ${odourTypeLabel} - ${intensityLabel} Intensity`;

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
            .metric-value { font-size: 28px; font-weight: bold; color: ${severityColor}; }
            .metric-label { color: #64748b; font-size: 14px; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
            .detail-item { background: white; padding: 12px; border-radius: 6px; }
            .detail-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
            .detail-value { font-weight: 600; margin-top: 4px; }
            .weather-box { background: #e0f2fe; padding: 16px; border-radius: 8px; margin: 16px 0; }
            .weather-box h3 { color: #0369a1; margin: 0 0 12px 0; font-size: 14px; }
            .footer { padding: 16px; text-align: center; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">💨 ${severityLabel} Odour Alert</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">${alertData.siteName || "Wastewater Plant"}</p>
            </div>
            <div class="content">
              <p>Hello ${recipient.name},</p>
              <p>A high-intensity odour incident has been recorded that requires immediate attention:</p>
              
              <div class="metric-box">
                <div class="metric-label">Odour Type</div>
                <div class="metric-value">${odourTypeLabel}</div>
                <div class="metric-label" style="margin-top: 8px;">
                  Intensity: ${alertData.intensity}/5 (${intensityLabel})
                </div>
              </div>

              <div class="details-grid">
                <div class="detail-item">
                  <div class="detail-label">Reported</div>
                  <div class="detail-value">${new Date(alertData.incidentAt).toLocaleString()}</div>
                </div>
                ${alertData.frequency ? `
                <div class="detail-item">
                  <div class="detail-label">Frequency</div>
                  <div class="detail-value">${alertData.frequency}/5</div>
                </div>
                ` : ""}
                ${alertData.offensiveness ? `
                <div class="detail-item">
                  <div class="detail-label">Offensiveness</div>
                  <div class="detail-value">${alertData.offensiveness}/5</div>
                </div>
                ` : ""}
                ${alertData.duration ? `
                <div class="detail-item">
                  <div class="detail-label">Duration</div>
                  <div class="detail-value">${alertData.duration} minutes</div>
                </div>
                ` : ""}
              </div>

              ${alertData.locationImpact ? `
              <p><strong>Affected Area:</strong> ${alertData.locationImpact}</p>
              ` : ""}

              ${alertData.sourceSuspected ? `
              <p><strong>Suspected Source:</strong> ${alertData.sourceSuspected}</p>
              ` : ""}

              ${alertData.windSpeed !== undefined ? `
              <div class="weather-box">
                <h3>🌬️ WEATHER CONDITIONS AT TIME OF INCIDENT</h3>
                <p style="margin: 0;">
                  <strong>Wind:</strong> ${alertData.windSpeed} m/s from ${alertData.windDirection || "N/A"}<br>
                  ${alertData.temperature !== undefined ? `<strong>Temperature:</strong> ${alertData.temperature}°C` : ""}
                </p>
              </div>
              ` : ""}

              <p style="margin-top: 20px;">
                <strong>⚡ Immediate Action Required:</strong> Please investigate the source and implement corrective measures to mitigate odour emissions.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated alert from WaterOps Odour Monitoring</p>
              <p>Incident ID: ${alertData.incidentId}</p>
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
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          subject,
          body: html,
          status: "sent",
          provider_id: emailResponse.data?.id,
          sent_at: new Date().toISOString(),
        });

        emailResults.push({ email: recipient.email, status: "sent" });
        console.log(`Email sent successfully to ${recipient.email}`);
      } catch (emailError: any) {
        // Log failed email
        await supabase.from("email_logs").insert({
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          subject,
          status: "failed",
          fail_reason: emailError.message,
        });

        emailResults.push({ email: recipient.email, status: "failed", error: emailError.message });
        console.error(`Failed to send email to ${recipient.email}:`, emailError.message);
      }
    }

    return new Response(
      JSON.stringify({ success: true, results: emailResults }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-odour-alert function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
