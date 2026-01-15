import { DailyStatus } from '@/types/wastewater';
import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface QuickStatsProps {
  statuses: DailyStatus[];
}

export function QuickStats({ statuses }: QuickStatsProps) {
  const counts = {
    normal: statuses.filter(s => s.status === 'normal').length,
    warning: statuses.filter(s => s.status === 'warning').length,
    critical: statuses.filter(s => s.status === 'critical').length,
    missing: statuses.filter(s => s.status === 'missing').length,
  };

  const total = statuses.length;
  const compliance = ((counts.normal / total) * 100).toFixed(0);

  const stats = [
    { 
      label: 'Normal', 
      value: counts.normal, 
      icon: CheckCircle2, 
      color: 'text-status-normal',
      bg: 'bg-status-normal/10' 
    },
    { 
      label: 'Warning', 
      value: counts.warning, 
      icon: AlertTriangle, 
      color: 'text-status-warning',
      bg: 'bg-status-warning/10' 
    },
    { 
      label: 'Critical', 
      value: counts.critical, 
      icon: XCircle, 
      color: 'text-status-critical',
      bg: 'bg-status-critical/10' 
    },
    { 
      label: 'Missing', 
      value: counts.missing, 
      icon: Clock, 
      color: 'text-muted-foreground',
      bg: 'bg-muted/50' 
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Compliance Score */}
      <div className="col-span-2 lg:col-span-1 p-4 rounded-xl bg-card border border-border">
        <p className="text-xs text-muted-foreground mb-1">Today's Status</p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gradient">{compliance}%</span>
          <span className="text-sm text-muted-foreground">compliant</span>
        </div>
      </div>

      {/* Status counts */}
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div 
            key={stat.label}
            className={`p-4 rounded-xl border border-border ${stat.bg}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <Icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
          </div>
        );
      })}
    </div>
  );
}
