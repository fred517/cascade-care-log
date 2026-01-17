import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DigestRequest {
  siteId?: string;
  startDate?: string;
  endDate?: string;
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

const INTENSITY_LABELS: Record<number, string> = {
  1: "Very Weak",
  2: "Weak",
  3: "Moderate",
  4: "Strong",
  5: "Very Strong",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Weekly odour digest function called");

  // Handle CORS preflight
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

    // Parse request body
    const body: DigestRequest = await req.json().catch(() => ({}));
    
    // Default to last 7 days if no dates provided
    const endDate = body.endDate ? new Date(body.endDate) : new Date();
    const startDate = body.startDate 
      ? new Date(body.startDate) 
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    console.log(`Generating digest from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch sites (optionally filter by siteId)
    let sitesQuery = supabase.from("sites").select("id, name, address");
    if (body.siteId) {
      sitesQuery = sitesQuery.eq("id", body.siteId);
    }
    const { data: sites, error: sitesError } = await sitesQuery;

    if (sitesError) {
      console.error("Error fetching sites:", sitesError);
      throw new Error("Failed to fetch sites");
    }

    if (!sites || sites.length === 0) {
      console.log("No sites found");
      return new Response(
        JSON.stringify({ success: true, message: "No sites found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ site: string; emailsSent: number; incidentCount: number }> = [];

    for (const site of sites) {
      console.log(`Processing site: ${site.name}`);

      // Fetch incidents for this site within date range
      const { data: incidents, error: incidentsError } = await supabase
        .from("odour_incidents")
        .select("*")
        .eq("site_id", site.id)
        .gte("incident_at", startDate.toISOString())
        .lte("incident_at", endDate.toISOString())
        .order("incident_at", { ascending: false });

      if (incidentsError) {
        console.error(`Error fetching incidents for ${site.name}:`, incidentsError);
        continue;
      }

      // Skip if no incidents
      if (!incidents || incidents.length === 0) {
        console.log(`No incidents for ${site.name} in date range`);
        results.push({ site: site.name, emailsSent: 0, incidentCount: 0 });
        continue;
      }

      console.log(`Found ${incidents.length} incidents for ${site.name}`);

      // Calculate statistics
      const totalIncidents = incidents.length;
      const resolvedCount = incidents.filter(i => i.status === "resolved" || i.status === "closed").length;
      const openCount = incidents.filter(i => i.status === "open").length;
      const investigatingCount = incidents.filter(i => i.status === "investigating").length;
      
      const highIntensityIncidents = incidents.filter(i => (i.intensity || 0) >= 4);
      
      // Average intensity
      const incidentsWithIntensity = incidents.filter(i => i.intensity);
      const avgIntensity = incidentsWithIntensity.length > 0
        ? incidentsWithIntensity.reduce((sum, i) => sum + (i.intensity || 0), 0) / incidentsWithIntensity.length
        : 0;

      // By type breakdown
      const byType: Record<string, number> = {};
      incidents.forEach(i => {
        const type = i.odour_type || "unknown";
        byType[type] = (byType[type] || 0) + 1;
      });

      // By intensity breakdown
      const byIntensity: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      incidents.forEach(i => {
        if (i.intensity) {
          byIntensity[i.intensity] = (byIntensity[i.intensity] || 0) + 1;
        }
      });

      // Fetch email recipients for this site
      const { data: recipients, error: recipientsError } = await supabase
        .from("email_recipients")
        .select("id, name, email")
        .eq("is_active", true)
        .or(`site_id.eq.${site.id},site_id.is.null`);

      if (recipientsError) {
        console.error(`Error fetching recipients for ${site.name}:`, recipientsError);
        continue;
      }

      if (!recipients || recipients.length === 0) {
        console.log(`No active recipients for ${site.name}`);
        results.push({ site: site.name, emailsSent: 0, incidentCount: totalIncidents });
        continue;
      }

      // Build HTML email
      const formatDate = (date: Date) => date.toLocaleDateString("en-US", { 
        weekday: "short", month: "short", day: "numeric", year: "numeric" 
      });

      const typeBreakdownHtml = Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${ODOUR_TYPE_LABELS[type] || type}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${count}</td>
          </tr>
        `).join("");

      const intensityBreakdownHtml = [5, 4, 3, 2, 1].map(level => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${
              level === 5 ? "#ef4444" : level === 4 ? "#f97316" : level === 3 ? "#eab308" : level === 2 ? "#84cc16" : "#22c55e"
            }; margin-right: 8px;"></span>
            ${level}/5 - ${INTENSITY_LABELS[level]}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${byIntensity[level]}</td>
        </tr>
      `).join("");

      const highIntensityListHtml = highIntensityIncidents.length > 0
        ? highIntensityIncidents.slice(0, 5).map(incident => `
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${new Date(incident.incident_at).toLocaleDateString()}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${ODOUR_TYPE_LABELS[incident.odour_type] || incident.odour_type}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                <span style="background-color: ${incident.intensity === 5 ? "#ef4444" : "#f97316"}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${incident.intensity}/5</span>
              </td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-transform: capitalize;">${incident.status}</td>
            </tr>
          `).join("")
        : `<tr><td colspan="4" style="padding: 16px; text-align: center; color: #22c55e;">✓ No high intensity incidents this week</td></tr>`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0 0 8px 0; font-size: 24px;">Weekly Odour Digest</h1>
            <p style="margin: 0; opacity: 0.9;">${site.name}</p>
            ${site.address ? `<p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 14px;">${site.address}</p>` : ""}
          </div>

          <!-- Date Range -->
          <div style="background-color: #f3f4f6; padding: 16px 24px; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              📅 ${formatDate(startDate)} - ${formatDate(endDate)}
            </p>
          </div>

          <!-- Summary Stats -->
          <div style="padding: 24px; background-color: white; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">Summary</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 16px;">
              <div style="flex: 1; min-width: 120px; background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #3b82f6;">${totalIncidents}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Total Incidents</p>
              </div>
              <div style="flex: 1; min-width: 120px; background-color: #fef2f2; padding: 16px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #ef4444;">${highIntensityIncidents.length}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">High Intensity (4-5)</p>
              </div>
              <div style="flex: 1; min-width: 120px; background-color: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #22c55e;">${resolvedCount}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Resolved</p>
              </div>
            </div>
            <div style="margin-top: 16px; display: flex; gap: 16px;">
              <div style="flex: 1; background-color: #fef3c7; padding: 12px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; font-size: 20px; font-weight: 600; color: #d97706;">${openCount}</p>
                <p style="margin: 2px 0 0 0; font-size: 11px; color: #92400e;">Open</p>
              </div>
              <div style="flex: 1; background-color: #fef9c3; padding: 12px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; font-size: 20px; font-weight: 600; color: #ca8a04;">${investigatingCount}</p>
                <p style="margin: 2px 0 0 0; font-size: 11px; color: #a16207;">Investigating</p>
              </div>
              <div style="flex: 1; background-color: #ede9fe; padding: 12px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; font-size: 20px; font-weight: 600; color: #7c3aed;">${avgIntensity.toFixed(1)}</p>
                <p style="margin: 2px 0 0 0; font-size: 11px; color: #6d28d9;">Avg Intensity</p>
              </div>
            </div>
          </div>

          <!-- High Intensity Incidents -->
          <div style="padding: 24px; background-color: white; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">⚠️ High Intensity Incidents</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 8px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Date</th>
                  <th style="padding: 8px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Type</th>
                  <th style="padding: 8px 12px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Intensity</th>
                  <th style="padding: 8px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${highIntensityListHtml}
              </tbody>
            </table>
            ${highIntensityIncidents.length > 5 ? `<p style="margin: 12px 0 0 0; font-size: 12px; color: #6b7280;">+ ${highIntensityIncidents.length - 5} more high intensity incidents</p>` : ""}
          </div>

          <!-- Breakdown by Type -->
          <div style="padding: 24px; background-color: white; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">📊 By Odour Type</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 8px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Type</th>
                  <th style="padding: 8px 12px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Count</th>
                </tr>
              </thead>
              <tbody>
                ${typeBreakdownHtml}
              </tbody>
            </table>
          </div>

          <!-- Breakdown by Intensity -->
          <div style="padding: 24px; background-color: white; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">📈 By Intensity Level</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 8px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Intensity</th>
                  <th style="padding: 8px 12px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Count</th>
                </tr>
              </thead>
              <tbody>
                ${intensityBreakdownHtml}
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div style="background-color: #f3f4f6; padding: 20px 24px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">
              This is an automated weekly digest from WaterOps.<br>
              Generated on ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>

        </body>
        </html>
      `;

      // Send to each recipient
      let emailsSent = 0;
      for (const recipient of recipients) {
        try {
          const { error: sendError } = await resend.emails.send({
            from: "WaterOps <onboarding@resend.dev>",
            to: [recipient.email],
            subject: `Weekly Odour Digest - ${site.name} (${formatDate(startDate)} - ${formatDate(endDate)})`,
            html: emailHtml,
          });

          if (sendError) {
            console.error(`Failed to send to ${recipient.email}:`, sendError);
            await supabase.from("email_logs").insert({
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              subject: `Weekly Odour Digest - ${site.name}`,
              status: "failed",
              fail_reason: sendError.message,
              site_id: site.id,
            });
          } else {
            console.log(`Sent digest to ${recipient.email}`);
            emailsSent++;
            await supabase.from("email_logs").insert({
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              subject: `Weekly Odour Digest - ${site.name}`,
              status: "sent",
              sent_at: new Date().toISOString(),
              site_id: site.id,
            });
          }
        } catch (err) {
          console.error(`Error sending to ${recipient.email}:`, err);
        }
      }

      results.push({ site: site.name, emailsSent, incidentCount: totalIncidents });
    }

    console.log("Digest complete:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Weekly digest sent",
        results 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in weekly digest function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
