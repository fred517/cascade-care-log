import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CalibrationSchedule {
  id: string;
  site_id: string;
  meter_name: string;
  meter_type: string;
  interval_days: number;
  next_due_at: string;
  assigned_to: string | null;
  notes: string | null;
  sites: {
    name: string;
  } | null;
  profiles: {
    email: string;
    display_name: string;
  } | null;
}

interface EmailRecipient {
  email: string;
  name: string | null;
  site_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional parameters
    const body = await req.json().catch(() => ({}));
    const { site_id, days_ahead = 1 } = body;

    console.log(`Checking calibrations due within ${days_ahead} days`);

    // Calculate the due date threshold
    const now = new Date();
    const dueThreshold = new Date(now.getTime() + days_ahead * 24 * 60 * 60 * 1000);

    // Fetch calibrations that are due or overdue
    let query = supabase
      .from("calibration_schedules")
      .select(`
        id,
        site_id,
        meter_name,
        meter_type,
        interval_days,
        next_due_at,
        assigned_to,
        notes,
        sites!inner(name),
        profiles:assigned_to(email, display_name)
      `)
      .eq("is_active", true)
      .lte("next_due_at", dueThreshold.toISOString())
      .order("next_due_at", { ascending: true });

    if (site_id) {
      query = query.eq("site_id", site_id);
    }

    const { data: dueCalibrations, error: calError } = await query;

    if (calError) {
      console.error("Error fetching calibrations:", calError);
      throw calError;
    }

    if (!dueCalibrations?.length) {
      console.log("No calibrations due");
      return new Response(
        JSON.stringify({ message: "No calibrations due", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${dueCalibrations.length} calibrations due`);

    // Group calibrations by site for email recipients
    const siteCalibrations: Record<string, CalibrationSchedule[]> = {};
    for (const cal of dueCalibrations as unknown as CalibrationSchedule[]) {
      if (!siteCalibrations[cal.site_id]) {
        siteCalibrations[cal.site_id] = [];
      }
      siteCalibrations[cal.site_id].push(cal);
    }

    // Get email recipients for each site
    const siteIds = Object.keys(siteCalibrations);
    const { data: recipients, error: recipError } = await supabase
      .from("email_recipients")
      .select("email, name, site_id")
      .in("site_id", siteIds)
      .eq("is_active", true)
      .contains("alert_types", ["all"]);

    if (recipError) {
      console.warn("Error fetching recipients:", recipError);
    }

    const recipientsBySite: Record<string, EmailRecipient[]> = {};
    for (const r of (recipients || []) as EmailRecipient[]) {
      if (!recipientsBySite[r.site_id]) {
        recipientsBySite[r.site_id] = [];
      }
      recipientsBySite[r.site_id].push(r);
    }

    // Send reminder emails
    let emailsSent = 0;
    const errors: string[] = [];

    for (const [siteId, calibrations] of Object.entries(siteCalibrations)) {
      const siteName = calibrations[0]?.sites?.name || "Unknown Site";
      const siteRecipients = recipientsBySite[siteId] || [];

      // Also send to assigned users
      const assignedEmails = new Set<string>();
      for (const cal of calibrations) {
        if (cal.profiles?.email) {
          assignedEmails.add(cal.profiles.email);
        }
      }

      // Combine recipients
      const allEmails = new Set([
        ...siteRecipients.map(r => r.email),
        ...assignedEmails,
      ]);

      if (allEmails.size === 0) {
        console.log(`No recipients for site ${siteName}`);
        continue;
      }

      // Build email content
      const overdueCount = calibrations.filter(c => new Date(c.next_due_at) < now).length;
      const dueToday = calibrations.filter(c => {
        const dueDate = new Date(c.next_due_at);
        return dueDate >= now && dueDate.toDateString() === now.toDateString();
      }).length;

      const calibrationRows = calibrations.map(cal => {
        const dueDate = new Date(cal.next_due_at);
        const isOverdue = dueDate < now;
        const status = isOverdue ? "🔴 OVERDUE" : dueDate.toDateString() === now.toDateString() ? "🟡 Due Today" : "🟢 Upcoming";
        
        return `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px; font-weight: 500;">${cal.meter_name}</td>
            <td style="padding: 12px;">${cal.meter_type}</td>
            <td style="padding: 12px;">${dueDate.toLocaleDateString()}</td>
            <td style="padding: 12px;">${status}</td>
            <td style="padding: 12px;">${cal.profiles?.display_name || "Unassigned"}</td>
          </tr>
        `;
      }).join("");

      const emailHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚙️ Calibration Reminder</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${siteName}</p>
          </div>
          
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
            <div style="display: flex; gap: 16px; margin-bottom: 20px;">
              ${overdueCount > 0 ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; flex: 1;">
                  <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${overdueCount}</div>
                  <div style="font-size: 12px; color: #991b1b;">Overdue</div>
                </div>
              ` : ""}
              ${dueToday > 0 ? `
                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; flex: 1;">
                  <div style="font-size: 24px; font-weight: bold; color: #d97706;">${dueToday}</div>
                  <div style="font-size: 12px; color: #92400e;">Due Today</div>
                </div>
              ` : ""}
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; flex: 1;">
                <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${calibrations.length}</div>
                <div style="font-size: 12px; color: #166534;">Total Due</div>
              </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280;">Meter</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280;">Type</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280;">Due Date</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280;">Status</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280;">Assigned</th>
                </tr>
              </thead>
              <tbody>
                ${calibrationRows}
              </tbody>
            </table>
            
            <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
              Please complete these calibrations as scheduled to maintain accurate readings.
            </p>
          </div>
          
          <div style="background: #1f2937; padding: 16px 24px; border-radius: 0 0 12px 12px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This is an automated reminder from your wastewater monitoring system.
            </p>
          </div>
        </div>
      `;

      // Send to each recipient
      for (const email of allEmails) {
        try {
          await resend.emails.send({
            from: "Calibration Reminders <onboarding@resend.dev>",
            to: [email],
            subject: `⚙️ ${overdueCount > 0 ? `${overdueCount} Overdue` : `${calibrations.length} Due`} Calibrations - ${siteName}`,
            html: emailHtml,
          });
          emailsSent++;
          console.log(`Sent reminder to ${email}`);
        } catch (emailError) {
          const errMsg = emailError instanceof Error ? emailError.message : "Unknown error";
          console.error(`Failed to send to ${email}:`, errMsg);
          errors.push(`${email}: ${errMsg}`);
        }
      }
    }

    console.log(`Sent ${emailsSent} reminder emails`);

    return new Response(
      JSON.stringify({
        message: `Sent ${emailsSent} calibration reminder emails`,
        sent: emailsSent,
        calibrations_due: dueCalibrations.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending reminders:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
