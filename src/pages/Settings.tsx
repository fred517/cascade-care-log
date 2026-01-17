import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmailRecipients } from '@/components/settings/EmailRecipients';
import { SiteSettings } from '@/components/settings/SiteSettings';
import { UserManagement } from '@/components/settings/UserManagement';
import { SiteMemberManagement } from '@/components/settings/SiteMemberManagement';
import { Threshold, MetricType, METRICS } from '@/types/wastewater';
import { useReadings } from '@/hooks/useReadings';
import { useSite } from '@/hooks/useSite';
import { useAuth } from '@/hooks/useAuth';
import { useMissingReadingsReminder } from '@/hooks/useMissingReadingsReminder';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Sliders, Bell, Users, Building2, Check, RotateCcw, Loader2, Send, AlertCircle, CheckCircle2, FileText, ShieldAlert, UserCog, UsersRound } from 'lucide-react';
import { toast } from 'sonner';

type SettingsTab = 'thresholds' | 'notifications' | 'team' | 'site-members' | 'users' | 'site';

export default function Settings() {
  const { site, loading: siteLoading } = useSite();
  const { thresholds, updateThreshold, loading: readingsLoading } = useReadings();
  const { sendReminder, sending: sendingReminder, lastResult: reminderResult } = useMissingReadingsReminder();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('thresholds');
  const [localThresholds, setLocalThresholds] = useState<Partial<Record<MetricType, { min: number; max: number; enabled: boolean }>>>({
    svi: { min: 50, max: 150, enabled: true },
    ph: { min: 6.5, max: 8.5, enabled: true },
    do: { min: 2.0, max: 6.0, enabled: true },
    orp: { min: -50, max: 200, enabled: true },
    mlss: { min: 2000, max: 4000, enabled: true },
    ammonia_tan: { min: 0, max: 5, enabled: true },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [digestResult, setDigestResult] = useState<any>(null);

  // Initialize local thresholds from database
  useEffect(() => {
    if (thresholds.length > 0) {
      const newLocal = { ...localThresholds };
      thresholds.forEach(t => {
        const metricId = t.metric_id as MetricType;
        if (metricId in newLocal) {
          newLocal[metricId] = {
            min: t.min_value,
            max: t.max_value,
            enabled: t.enabled,
          };
        }
      });
      setLocalThresholds(newLocal);
    }
  }, [thresholds]);

  // Fetch team members
  const fetchTeam = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`
        id,
        user_id,
        display_name,
        email
      `)
      .limit(50);

    if (data) {
      // Get roles for each user
      const membersWithRoles = await Promise.all(
        data.map(async (member) => {
          const { data: roleData } = await supabase
            .rpc('get_user_role', { _user_id: member.user_id });
          return { ...member, role: roleData || 'operator' };
        })
      );
      setTeamMembers(membersWithRoles);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const tabs = [
    { key: 'thresholds' as const, label: 'Thresholds', icon: Sliders },
    { key: 'notifications' as const, label: 'Notifications', icon: Bell },
    { key: 'team' as const, label: 'Team', icon: Users },
    { key: 'site-members' as const, label: 'Site Members', icon: UsersRound },
    { key: 'users' as const, label: 'User Roles', icon: UserCog, adminOnly: true },
    { key: 'site' as const, label: 'Site', icon: Building2 },
  ];

  const handleThresholdChange = (metricId: MetricType, field: 'min' | 'max' | 'enabled', value: number | boolean) => {
    setLocalThresholds(prev => ({
      ...prev,
      [metricId]: { ...prev[metricId], [field]: value },
    }));
  };

  const handleResetThreshold = (metricId: MetricType) => {
    const metric = METRICS[metricId];
    setLocalThresholds(prev => ({
      ...prev,
      [metricId]: { min: metric.defaultMin, max: metric.defaultMax, enabled: true },
    }));
  };

  const handleSaveThresholds = async () => {
    setIsSaving(true);
    try {
      for (const [metricId, values] of Object.entries(localThresholds)) {
        await updateThreshold(metricId, values.min, values.max, values.enabled);
      }
      toast.success('Thresholds saved successfully');
    } catch (error) {
      toast.error('Failed to save thresholds');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendDigest = async () => {
    setSendingDigest(true);
    setDigestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-odour-digest', {
        body: { siteId: site?.id },
      });

      if (error) throw error;
      
      setDigestResult(data);
      toast.success('Weekly digest sent successfully');
    } catch (error: any) {
      console.error('Error sending digest:', error);
      toast.error('Failed to send weekly digest');
    } finally {
      setSendingDigest(false);
    }
  };

  const loading = siteLoading || readingsLoading;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Configure thresholds, notifications, and site preferences
            {site && <span className="ml-1">for {site.name}</span>}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 p-1 bg-muted/50 rounded-xl">
          {tabs
            .filter(tab => !tab.adminOnly || isAdmin)
            .map(({ key, label, icon: Icon, adminOnly }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {adminOnly && (
                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                  Admin
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-card rounded-xl border border-border p-6">
          {activeTab === 'thresholds' && (
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-1">
                      Metric Thresholds
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Set minimum and maximum values for each metric. Alerts will trigger when readings fall outside these ranges.
                    </p>
                  </div>
                  {!isAdmin && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Admin only</span>
                    </div>
                  )}
                </div>
              </div>
              
              {!isAdmin ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Admin Access Required</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Only administrators can modify threshold settings. Contact your admin to request changes.
                  </p>
                  
                  {/* Read-only view of current thresholds */}
                  <div className="mt-8 text-left max-w-2xl mx-auto">
                    <h4 className="text-sm font-medium text-muted-foreground mb-4">Current Thresholds</h4>
                    <div className="space-y-2">
                      {Object.values(METRICS).map(metric => {
                        const threshold = localThresholds[metric.id];
                        return (
                          <div 
                            key={metric.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "w-2 h-2 rounded-full",
                                threshold?.enabled ? "bg-green-500" : "bg-muted-foreground"
                              )} />
                              <span className="font-medium">{metric.name}</span>
                            </div>
                            <span className="text-sm text-muted-foreground font-mono">
                              {threshold?.min} - {threshold?.max} {metric.unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {Object.values(METRICS).map(metric => {
                      const threshold = localThresholds[metric.id];
                      const isModified = 
                        threshold.min !== metric.defaultMin || 
                        threshold.max !== metric.defaultMax;

                      return (
                        <div 
                          key={metric.id}
                          className={cn(
                            "p-4 rounded-xl border transition-all duration-300",
                            threshold.enabled 
                              ? "bg-card border-border" 
                              : "bg-muted/30 border-muted"
                          )}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={threshold.enabled}
                                  onChange={(e) => handleThresholdChange(metric.id, 'enabled', e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                              </label>
                              <div>
                                <h3 className="font-semibold text-foreground">{metric.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Default: {metric.defaultMin} - {metric.defaultMax} {metric.unit}
                                </p>
                              </div>
                            </div>

                            {isModified && (
                              <button
                                onClick={() => handleResetThreshold(metric.id)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Reset
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-muted-foreground mb-1">
                                Minimum {metric.unit && `(${metric.unit})`}
                              </label>
                              <input
                                type="number"
                                step={metric.precision > 0 ? Math.pow(10, -metric.precision) : 1}
                                value={threshold.min}
                                onChange={(e) => handleThresholdChange(metric.id, 'min', parseFloat(e.target.value) || 0)}
                                disabled={!threshold.enabled}
                                className="input-field font-mono disabled:opacity-50"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-muted-foreground mb-1">
                                Maximum {metric.unit && `(${metric.unit})`}
                              </label>
                              <input
                                type="number"
                                step={metric.precision > 0 ? Math.pow(10, -metric.precision) : 1}
                                value={threshold.max}
                                onChange={(e) => handleThresholdChange(metric.id, 'max', parseFloat(e.target.value) || 0)}
                                disabled={!threshold.enabled}
                                className="input-field font-mono disabled:opacity-50"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end mt-6">
                    <button
                      onClick={handleSaveThresholds}
                      disabled={isSaving}
                      className="flex items-center gap-2 btn-primary disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Save Thresholds
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8">
              {/* Email Recipients Section */}
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-foreground mb-1">
                    Email Recipients
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage recipients who will receive alerts when thresholds are exceeded.
                  </p>
                </div>
                
                <EmailRecipients />
              </div>

              {/* Missing Readings Reminders Section */}
              <div className="border-t border-border pt-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-foreground mb-1">
                    Missing Readings Reminders
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Send email reminders to recipients when readings haven't been recorded for the day.
                  </p>
                </div>

                <div className="bg-muted/30 rounded-xl p-6 border border-border">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-foreground mb-1">Send Reminder Now</h3>
                      <p className="text-sm text-muted-foreground">
                        Check for missing readings today and send email reminders to all active recipients.
                      </p>
                    </div>
                    <button
                      onClick={() => sendReminder(site?.id)}
                      disabled={sendingReminder}
                      className="flex items-center gap-2 btn-primary whitespace-nowrap disabled:opacity-50"
                    >
                      {sendingReminder ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Reminders
                        </>
                      )}
                    </button>
                  </div>

                  {/* Last reminder result */}
                  {reminderResult && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Last Check Results</h4>
                      <div className="space-y-2">
                        {reminderResult.results.map((result, index) => (
                          <div 
                            key={index}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg",
                              result.missingCount === 0 
                                ? "bg-status-normal/10 border border-status-normal/30"
                                : result.status === 'reminders_sent'
                                ? "bg-status-warning/10 border border-status-warning/30"
                                : "bg-muted/50 border border-border"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {result.missingCount === 0 ? (
                                <CheckCircle2 className="w-5 h-5 text-status-normal" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-status-warning" />
                              )}
                              <div>
                                <p className="font-medium text-foreground">{result.site}</p>
                                <p className="text-sm text-muted-foreground">
                                  {result.missingCount === 0 
                                    ? 'All readings complete' 
                                    : `${result.missingCount} missing: ${result.missingMetrics?.join(', ')}`
                                  }
                                </p>
                              </div>
                            </div>
                            {result.status === 'reminders_sent' && result.recipientCount && (
                              <span className="text-xs bg-status-warning/20 text-status-warning px-2 py-1 rounded-full">
                                Sent to {result.recipientCount} recipient{result.recipientCount > 1 ? 's' : ''}
                              </span>
                            )}
                            {result.status === 'no_recipients' && (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                                No recipients
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  💡 Tip: For automated daily reminders, consider setting up a scheduled job to call this function at the end of each shift.
                </p>
              </div>

              {/* Weekly Odour Digest Section */}
              <div className="border-t border-border pt-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-foreground mb-1">
                    Weekly Odour Digest
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Send a summary email of odour incidents from the past week to all active recipients.
                  </p>
                </div>

                <div className="bg-muted/30 rounded-xl p-6 border border-border">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-foreground mb-1">Send Weekly Digest Now</h3>
                      <p className="text-sm text-muted-foreground">
                        Generate and send a summary of all odour incidents from the past 7 days.
                      </p>
                    </div>
                    <button
                      onClick={handleSendDigest}
                      disabled={sendingDigest}
                      className="flex items-center gap-2 btn-primary whitespace-nowrap disabled:opacity-50"
                    >
                      {sendingDigest ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          Send Digest
                        </>
                      )}
                    </button>
                  </div>

                  {/* Digest result */}
                  {digestResult && digestResult.results && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Digest Results</h4>
                      <div className="space-y-2">
                        {digestResult.results.map((result: any, index: number) => (
                          <div 
                            key={index}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg",
                              result.emailsSent > 0 
                                ? "bg-status-normal/10 border border-status-normal/30"
                                : "bg-muted/50 border border-border"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {result.emailsSent > 0 ? (
                                <CheckCircle2 className="w-5 h-5 text-status-normal" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                              )}
                              <div>
                                <p className="font-medium text-foreground">{result.site}</p>
                                <p className="text-sm text-muted-foreground">
                                  {result.incidentCount} incidents this week
                                </p>
                              </div>
                            </div>
                            {result.emailsSent > 0 && (
                              <span className="text-xs bg-status-normal/20 text-status-normal px-2 py-1 rounded-full">
                                Sent to {result.emailsSent} recipient{result.emailsSent > 1 ? 's' : ''}
                              </span>
                            )}
                            {result.emailsSent === 0 && result.incidentCount === 0 && (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                                No incidents
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  💡 Tip: Set up a weekly cron job to automatically send this digest every Monday morning.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-1">
                  Team Management
                </h2>
                <p className="text-sm text-muted-foreground">
                  View team members and their access levels.
                </p>
              </div>
              
              <div className="space-y-3">
                {teamMembers.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No team members found
                  </p>
                ) : (
                  teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 rounded-xl border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                          {(member.display_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{member.display_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium capitalize",
                        member.role === 'admin' ? "bg-primary/20 text-primary" :
                        member.role === 'supervisor' ? "bg-status-info/20 text-status-info" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {member.role}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'site-members' && (
            <SiteMemberManagement />
          )}

          {activeTab === 'users' && (
            <UserManagement teamMembers={teamMembers} onRoleUpdated={fetchTeam} />
          )}

          {activeTab === 'site' && (
            <SiteSettings site={site} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
