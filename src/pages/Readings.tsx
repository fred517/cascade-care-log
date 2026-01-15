import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ReadingForm } from '@/components/readings/ReadingForm';
import { Reading } from '@/types/wastewater';
import { Clock } from 'lucide-react';

export default function Readings() {
  const [recentSubmissions, setRecentSubmissions] = useState<Reading[]>([]);

  const handleSubmit = (readings: Omit<Reading, 'id'>[]) => {
    const newReadings = readings.map((r, index) => ({
      ...r,
      id: `new-${Date.now()}-${index}`,
    }));
    setRecentSubmissions(prev => [...newReadings, ...prev].slice(0, 10));
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Add Daily Readings</h1>
          <p className="text-muted-foreground">
            Enter today's process measurements for all metrics
          </p>
        </div>

        {/* Current Time */}
        <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-primary/10 border border-primary/30">
          <Clock className="w-5 h-5 text-primary" />
          <span className="text-sm">
            Recording for: <span className="font-semibold text-foreground">
              {new Date().toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </span>
        </div>

        {/* Form */}
        <ReadingForm onSubmit={handleSubmit} />

        {/* Recent Submissions */}
        {recentSubmissions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Just Submitted</h2>
            <div className="bg-status-normal/10 border border-status-normal/30 rounded-xl p-4">
              <div className="flex flex-wrap gap-3">
                {recentSubmissions.slice(0, 6).map((reading, index) => (
                  <div 
                    key={reading.id}
                    className="px-3 py-2 rounded-lg bg-card border border-border animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {reading.metricId.toUpperCase()}:
                    </span>
                    <span className="text-sm text-muted-foreground ml-2 font-mono">
                      {reading.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
