import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ThresholdSettings } from '@/components/settings/ThresholdSettings';
import { EmailRecipients } from '@/components/settings/EmailRecipients';
import { mockThresholds } from '@/data/mockData';
import { Threshold } from '@/types/wastewater';
import { cn } from '@/lib/utils';
import { Sliders, Bell, Users, Building2 } from 'lucide-react';

type SettingsTab = 'thresholds' | 'notifications' | 'team' | 'site';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('thresholds');
  const [thresholds, setThresholds] = useState<Threshold[]>(mockThresholds);

  const tabs = [
    { key: 'thresholds' as const, label: 'Thresholds', icon: Sliders },
    { key: 'notifications' as const, label: 'Notifications', icon: Bell },
    { key: 'team' as const, label: 'Team', icon: Users },
    { key: 'site' as const, label: 'Site', icon: Building2 },
  ];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Configure thresholds, notifications, and site preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 p-1 bg-muted/50 rounded-xl">
          {tabs.map(({ key, label, icon: Icon }) => (
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
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-card rounded-xl border border-border p-6">
          {activeTab === 'thresholds' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-1">
                  Metric Thresholds
                </h2>
                <p className="text-sm text-muted-foreground">
                  Set minimum and maximum values for each metric. Alerts will trigger when readings fall outside these ranges.
                </p>
              </div>
              <ThresholdSettings 
                thresholds={thresholds} 
                onSave={setThresholds} 
              />
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-1">
                  Email Notifications
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manage recipients who will receive alerts when thresholds are exceeded.
                </p>
              </div>
              
              <EmailRecipients />
            </div>
          )}

          {activeTab === 'team' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-1">
                  Team Management
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manage operators and their access levels.
                </p>
              </div>
              
              <div className="space-y-3">
                {[
                  { name: 'John Operator', email: 'john@plant.com', role: 'Operator' },
                  { name: 'Jane Supervisor', email: 'jane@plant.com', role: 'Supervisor' },
                  { name: 'Admin User', email: 'admin@plant.com', role: 'Admin' },
                ].map((user) => (
                  <div key={user.email} className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      user.role === 'Admin' ? "bg-primary/20 text-primary" :
                      user.role === 'Supervisor' ? "bg-status-info/20 text-status-info" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>

              <button className="mt-4 px-4 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors w-full">
                + Add Team Member
              </button>
            </div>
          )}

          {activeTab === 'site' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-1">
                  Site Configuration
                </h2>
                <p className="text-sm text-muted-foreground">
                  Configure site details and preferences.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Site Name
                  </label>
                  <input 
                    type="text" 
                    defaultValue="Main Treatment Plant"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Timezone
                  </label>
                  <select className="input-field">
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Ammonia Reporting Basis
                  </label>
                  <select className="input-field">
                    <option value="nh3n">NH₃-N (Ammonia Nitrogen)</option>
                    <option value="nh4n">NH₄-N (Ammonium Nitrogen)</option>
                  </select>
                </div>

                <button className="btn-primary w-full mt-4">
                  Save Site Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
