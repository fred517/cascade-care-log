import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AlertCard } from '@/components/alerts/AlertCard';
import { mockAlerts, mockPlaybooks } from '@/data/mockData';
import { AlertEvent } from '@/types/wastewater';
import { cn } from '@/lib/utils';
import { Bell, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

type FilterStatus = 'all' | 'active' | 'acknowledged' | 'resolved';

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertEvent[]>(mockAlerts);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId 
        ? { 
            ...a, 
            status: 'acknowledged', 
            acknowledgedBy: 'Current Operator',
            acknowledgedAt: new Date()
          } 
        : a
    ));
  };

  const handleResolve = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, status: 'resolved' } : a
    ));
  };

  const filteredAlerts = alerts.filter(a => 
    filterStatus === 'all' || a.status === filterStatus
  );

  const counts = {
    all: alerts.length,
    active: alerts.filter(a => a.status === 'active').length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
  };

  const filters: { key: FilterStatus; label: string; icon: any }[] = [
    { key: 'all', label: 'All', icon: Bell },
    { key: 'active', label: 'Active', icon: AlertTriangle },
    { key: 'acknowledged', label: 'Acknowledged', icon: Clock },
    { key: 'resolved', label: 'Resolved', icon: CheckCircle2 },
  ];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Alerts Center</h1>
          <p className="text-muted-foreground">
            View and manage threshold violations and action playbooks
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                filterStatus === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs",
                filterStatus === key
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Alerts List */}
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <CheckCircle2 className="w-12 h-12 mx-auto text-status-normal mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">All Clear!</h2>
            <p className="text-muted-foreground">
              {filterStatus === 'all' 
                ? "No alerts to display. All metrics are within normal range."
                : `No ${filterStatus} alerts to display.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => {
              const playbook = mockPlaybooks.find(
                p => p.metricId === alert.metricId && p.condition === alert.type
              );
              
              return (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  playbook={playbook}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                />
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
