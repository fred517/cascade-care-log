import { useState } from 'react';
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';
import { 
  Wrench, 
  Plus, 
  Check, 
  AlertTriangle, 
  Clock, 
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  useCalibrationSchedules,
  useDueCalibrations,
  useCalibrationLogs,
  useCreateCalibrationSchedule,
  useRecordCalibration,
  METER_TYPES,
  type CalibrationSchedule,
} from '@/hooks/useCalibrations';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

function getCalibrationStatus(nextDueAt: string | null) {
  if (!nextDueAt) return { status: 'unknown', color: 'bg-muted', label: 'Not Set' };
  
  const dueDate = new Date(nextDueAt);
  const now = new Date();
  
  if (isPast(dueDate) && !isToday(dueDate)) {
    return { status: 'overdue', color: 'bg-destructive', label: 'Overdue' };
  }
  if (isToday(dueDate)) {
    return { status: 'due-today', color: 'bg-yellow-500', label: 'Due Today' };
  }
  const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 2) {
    return { status: 'due-soon', color: 'bg-orange-500', label: `Due in ${daysUntil}d` };
  }
  return { status: 'ok', color: 'bg-green-500', label: `Due in ${daysUntil}d` };
}

function AddCalibrationDialog() {
  const [open, setOpen] = useState(false);
  const [meterName, setMeterName] = useState('');
  const [meterType, setMeterType] = useState('general');
  const [intervalDays, setIntervalDays] = useState('7');
  const [notes, setNotes] = useState('');
  
  const createSchedule = useCreateCalibrationSchedule();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!meterName.trim()) {
      toast({ title: 'Error', description: 'Meter name is required', variant: 'destructive' });
      return;
    }

    try {
      await createSchedule.mutateAsync({
        meter_name: meterName.trim(),
        meter_type: meterType,
        interval_days: parseInt(intervalDays) || 7,
        notes: notes.trim() || undefined,
      });

      toast({ title: 'Success', description: 'Calibration schedule created' });
      setOpen(false);
      setMeterName('');
      setMeterType('general');
      setIntervalDays('7');
      setNotes('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create schedule', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Meter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Calibration Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meter-name">Meter Name</Label>
            <Input
              id="meter-name"
              placeholder="e.g., Aeration Basin MLSS Sensor"
              value={meterName}
              onChange={(e) => setMeterName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="meter-type">Meter Type</Label>
            <Select value={meterType} onValueChange={setMeterType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="interval">Calibration Interval (days)</Label>
            <Select value={intervalDays} onValueChange={setIntervalDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Daily</SelectItem>
                <SelectItem value="3">Every 3 days</SelectItem>
                <SelectItem value="7">Weekly (7 days)</SelectItem>
                <SelectItem value="14">Bi-weekly (14 days)</SelectItem>
                <SelectItem value="30">Monthly (30 days)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Special instructions or location details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSchedule.isPending}>
              {createSchedule.isPending ? 'Creating...' : 'Create Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecordCalibrationDialog({ schedule }: { schedule: CalibrationSchedule }) {
  const [open, setOpen] = useState(false);
  const [preReading, setPreReading] = useState('');
  const [postReading, setPostReading] = useState('');
  const [refValue, setRefValue] = useState('');
  const [notes, setNotes] = useState('');
  
  const recordCalibration = useRecordCalibration();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pre = preReading ? parseFloat(preReading) : undefined;
    const post = postReading ? parseFloat(postReading) : undefined;
    const ref = refValue ? parseFloat(refValue) : undefined;
    
    let deviation: number | undefined;
    if (post !== undefined && ref !== undefined && ref !== 0) {
      deviation = Math.abs(((post - ref) / ref) * 100);
    }

    try {
      await recordCalibration.mutateAsync({
        schedule_id: schedule.id,
        pre_cal_reading: pre,
        post_cal_reading: post,
        reference_value: ref,
        deviation_percent: deviation,
        passed: deviation === undefined || deviation <= 10,
        notes: notes.trim() || undefined,
      });

      toast({ title: 'Calibration Recorded', description: `Next due in ${schedule.interval_days} days` });
      setOpen(false);
      setPreReading('');
      setPostReading('');
      setRefValue('');
      setNotes('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to record calibration', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Check className="w-4 h-4 mr-1" />
          Record
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Calibration: {schedule.meter_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pre-reading">Pre-Cal Reading</Label>
              <Input
                id="pre-reading"
                type="number"
                step="any"
                placeholder="Before calibration"
                value={preReading}
                onChange={(e) => setPreReading(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref-value">Reference Value</Label>
              <Input
                id="ref-value"
                type="number"
                step="any"
                placeholder="Lab/standard value"
                value={refValue}
                onChange={(e) => setRefValue(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="post-reading">Post-Cal Reading</Label>
            <Input
              id="post-reading"
              type="number"
              step="any"
              placeholder="After calibration adjustment"
              value={postReading}
              onChange={(e) => setPostReading(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cal-notes">Notes (optional)</Label>
            <Textarea
              id="cal-notes"
              placeholder="Any observations or issues..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordCalibration.isPending}>
              {recordCalibration.isPending ? 'Recording...' : 'Record Calibration'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CalibrationItem({ schedule }: { schedule: CalibrationSchedule }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: logs = [] } = useCalibrationLogs(isOpen ? schedule.id : null);
  const status = getCalibrationStatus(schedule.next_due_at);
  const meterTypeLabel = METER_TYPES.find(t => t.value === schedule.meter_type)?.label || schedule.meter_type;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('w-3 h-3 rounded-full flex-shrink-0', status.color)} />
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">{schedule.meter_name}</div>
              <div className="text-xs text-muted-foreground">{meterTypeLabel}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={status.status === 'overdue' ? 'destructive' : 'secondary'} className="text-xs">
              {status.label}
            </Badge>
            <RecordCalibrationDialog schedule={schedule} />
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        
        <CollapsibleContent>
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Interval:</span>
                <span className="ml-2 font-medium">{schedule.interval_days} days</span>
              </div>
              {schedule.last_calibration_at && (
                <div>
                  <span className="text-muted-foreground">Last Cal:</span>
                  <span className="ml-2 font-medium">
                    {formatDistanceToNow(new Date(schedule.last_calibration_at), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
            
            {schedule.notes && (
              <p className="text-sm text-muted-foreground italic">{schedule.notes}</p>
            )}
            
            {logs.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase">Recent History</div>
                <div className="space-y-1">
                  {logs.slice(0, 3).map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                      <span>{format(new Date(log.calibrated_at), 'MMM d, yyyy h:mm a')}</span>
                      <div className="flex items-center gap-2">
                        {log.deviation_percent !== null && (
                          <span className={cn(
                            log.deviation_percent <= 10 ? 'text-green-600' : 'text-destructive'
                          )}>
                            {log.deviation_percent.toFixed(1)}% deviation
                          </span>
                        )}
                        <Badge variant={log.passed ? 'default' : 'destructive'} className="text-[10px]">
                          {log.passed ? 'PASS' : 'FAIL'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function CalibrationManager() {
  const { data: schedules = [], isLoading } = useCalibrationSchedules();
  const { data: dueCalibrations = [] } = useDueCalibrations();

  const overdueCount = dueCalibrations.filter(c => 
    c.next_due_at && isPast(new Date(c.next_due_at)) && !isToday(new Date(c.next_due_at))
  ).length;
  const dueTodayCount = dueCalibrations.filter(c => 
    c.next_due_at && isToday(new Date(c.next_due_at))
  ).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wrench className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Calibration Schedule</CardTitle>
            <p className="text-sm text-muted-foreground">
              {schedules.length} meters tracked
            </p>
          </div>
        </div>
        <AddCalibrationDialog />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary badges */}
        {(overdueCount > 0 || dueTodayCount > 0) && (
          <div className="flex gap-2 flex-wrap">
            {overdueCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {overdueCount} Overdue
              </Badge>
            )}
            {dueTodayCount > 0 && (
              <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                <Clock className="w-3 h-3" />
                {dueTodayCount} Due Today
              </Badge>
            )}
          </div>
        )}
        
        {/* Calibration list */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No calibration schedules yet</p>
            <p className="text-sm text-muted-foreground">Add a meter to start tracking calibrations</p>
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <CalibrationItem key={schedule.id} schedule={schedule} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
