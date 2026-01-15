import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MissingReadingsRequest {
  siteId?: string;
  checkDate?: string; // ISO date string, defaults to today
}

const METRICS = [
  { id: 'svi', name: 'SVI', unit: 'mL/g' },
  { id: 'ph', name: 'pH', unit: '' },
  { id: 'do', name: 'DO', unit: 'mg/L' },
  { id: 'orp', name: 'ORP', unit: 'mV' },
  { id: 'mlss', name: 'MLSS', unit: 'mg/L' },
  { id: 'ammonia', name: 'Ammonia', unit: 'mg/L' },
];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: MissingReadingsRequest = await req.json().catch(() => ({}));
    
    // Default to today
    const checkDate = requestData.checkDate 
      ? new Date(requestData.checkDate) 
      : new Date();
    
    const dateStr = checkDate.toISOString().split('T')[0];
    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;

    // Get sites to check
    let sitesQuery = supabase.from("sites").select("*");
    if (requestData.siteId) {
      sitesQuery = sitesQuery.eq("id", requestData.siteId);
    }
    
    const { data: sites, error: sitesError } = await sitesQuery;
    if (sitesError) throw new Error(`Failed to fetch sites: ${sitesError.message}`);
    if (!sites || sites.length === 0) {
      return new Response(
        JSON.stringify({ message: "No sites found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results: any[] = [];

    for (const site of sites) {
      // Get readings for this site today
      const { data: readings, error: readingsError } = await supabase
        .from("readings")
        .select("metric_id")
        .eq("site_id", site.id)
        .gte("recorded_at", startOfDay)
        .lte("recorded_at", endOfDay);

      if (readingsError) {
        console.error(`Error fetching readings for site ${site.id}:`, readingsError);
        continue;
      }

      const recordedMetrics = new Set(readings?.map(r => r.metric_id) || []);
      const missingMetrics = METRICS.filter(m => !recordedMetrics.has(m.id));

      if (missingMetrics.length === 0) {
        results.push({ site: site.name, status: "complete", missingCount: 0 });
        continue;
      }

      // Get active recipients for this site
      const { data: recipients, error: recipientsError } = await supabase
        .from("email_recipients")
        .select("*")
        .eq("is_active", true)
        .or(`site_id.eq.${site.id},site_id.is.null`);

      if (recipientsError) {
        console.error(`Error fetching recipients for site ${site.id}:`, recipientsError);
        continue;
      }

      if (!recipients || recipients.length === 0) {
        results.push({ 
          site: site.name, 
          status: "no_recipients", 
          missingCount: missingMetrics.length,
          missingMetrics: missingMetrics.map(m => m.name)
        });
        continue;
      }

      // Send reminder emails
      const formattedDate = new Intl.DateTimeFormat('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).format(checkDate);

      const missingMetricsList = missingMetrics
        .map(m => `<li><strong>${m.name}</strong>${m.unit ? ` (${m.unit})` : ''}</li>`)
        .join('');

      const recordedCount = METRICS.length - missingMetrics.length;
      const completionPercentage = Math.round((recordedCount / METRICS.length) * 100);

      for (const recipient of recipients) {
        const subject = `📋 Missing Readings Reminder - ${site.name} (${formattedDate})`;

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; }
              .content { background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
              .progress-container { background: #e2e8f0; border-radius: 999px; height: 12px; margin: 16px 0; overflow: hidden; }
              .progress-bar { background: linear-gradient(90deg, #22c55e, #16a34a); height: 100%; border-radius: 999px; transition: width 0.3s; }
              .missing-box { background: white; padding: 20px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b; }
              .missing-box h3 { color: #d97706; margin: 0 0 12px 0; }
              .missing-box ul { margin: 0; padding-left: 20px; }
              .missing-box li { margin: 6px 0; color: #64748b; }
              .stats { display: flex; gap: 16px; margin: 16px 0; }
              .stat-box { flex: 1; background: white; padding: 16px; border-radius: 8px; text-align: center; }
              .stat-value { font-size: 28px; font-weight: bold; color: #1a1a2e; }
              .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
              .cta-button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
              .footer { padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">📋 Daily Readings Reminder</h1>
                <p style="margin: 8px 0 0 0; opacity: 0.9;">${site.name} • ${formattedDate}</p>
              </div>
              <div class="content">
                <p>Hello ${recipient.name},</p>
                <p>This is a friendly reminder that some readings haven't been recorded yet for today.</p>
                
                <div class="stats">
                  <div class="stat-box">
                    <div class="stat-value" style="color: #22c55e;">${recordedCount}</div>
                    <div class="stat-label">Recorded</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-value" style="color: #f59e0b;">${missingMetrics.length}</div>
                    <div class="stat-label">Missing</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-value">${completionPercentage}%</div>
                    <div class="stat-label">Complete</div>
                  </div>
                </div>

                <div class="progress-container">
                  <div class="progress-bar" style="width: ${completionPercentage}%;"></div>
                </div>

                <div class="missing-box">
                  <h3>⚠️ Missing Readings</h3>
                  <ul>
                    ${missingMetricsList}
                  </ul>
                </div>

                <p>Please log into the system to complete today's readings before the end of your shift.</p>
              </div>
              <div class="footer">
                <p>This is an automated reminder from WaterOps</p>
                <p style="color: #94a3b8;">You're receiving this because you're registered to receive alerts for ${site.name}</p>
              </div>
            </div>
          </body>
          </html>
        `;

        try {
          const emailResponse = await resend.emails.send({
            from: "WaterOps Reminders <onboarding@resend.dev>",
            to: [recipient.email],
            subject,
            html,
          });

          // Log the email
          await supabase.from("email_logs").insert({
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            subject,
            body: html,
            status: "sent",
            provider_id: emailResponse.data?.id,
            sent_at: new Date().toISOString(),
          });

          console.log(`Reminder sent to ${recipient.email} for site ${site.name}`);
        } catch (emailError: any) {
          console.error(`Failed to send to ${recipient.email}:`, emailError);
          
          await supabase.from("email_logs").insert({
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            subject,
            status: "failed",
            fail_reason: emailError.message,
          });
        }
      }

      results.push({ 
        site: site.name, 
        status: "reminders_sent", 
        missingCount: missingMetrics.length,
        missingMetrics: missingMetrics.map(m => m.name),
        recipientCount: recipients.length
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        checkDate: dateStr,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-missing-readings-reminder function:", error);
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
