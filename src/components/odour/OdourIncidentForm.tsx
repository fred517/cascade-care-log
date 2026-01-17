import { useState, useEffect } from 'react';
import { Wind, Thermometer, Droplets, Gauge, Clock, MapPin, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateOdourIncident, useFetchWeather } from '@/hooks/useOdourMapping';
import { ODOUR_TYPES, FIDOL_SCALE, type OdourType, type WeatherData, type SiteMap } from '@/types/odour';
import { cn } from '@/lib/utils';

interface OdourIncidentFormProps {
  open: boolean;
  onClose: () => void;
  clickPosition: { x: number; y: number } | null;
  siteMap: SiteMap | null;
}

export default function OdourIncidentForm({ open, onClose, clickPosition, siteMap }: OdourIncidentFormProps) {
  const [odourType, setOdourType] = useState<OdourType | ''>('');
  const [frequency, setFrequency] = useState<number | null>(null);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [offensiveness, setOffensiveness] = useState<number | null>(null);
  const [duration, setDuration] = useState('');
  const [locationImpact, setLocationImpact] = useState('');
  const [sourceSuspected, setSourceSuspected] = useState('');
  const [notes, setNotes] = useState('');
  const [correctiveActions, setCorrectiveActions] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [fetchingWeather, setFetchingWeather] = useState(false);

  const createIncident = useCreateOdourIncident();
  const fetchWeather = useFetchWeather();

  // Auto-fetch weather when form opens and we have coordinates
  useEffect(() => {
    if (open && siteMap?.latitude && siteMap?.longitude) {
      setFetchingWeather(true);
      fetchWeather.mutateAsync({
        latitude: siteMap.latitude,
        longitude: siteMap.longitude,
      }).then((data) => {
        setWeather(data);
      }).catch(() => {
        // Error already handled by hook
      }).finally(() => {
        setFetchingWeather(false);
      });
    }
  }, [open, siteMap?.latitude, siteMap?.longitude]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clickPosition || !odourType) return;

    await createIncident.mutateAsync({
      site_map_id: siteMap?.id,
      click_x: clickPosition.x,
      click_y: clickPosition.y,
      latitude: siteMap?.latitude || undefined,
      longitude: siteMap?.longitude || undefined,
      incident_at: new Date().toISOString(),
      odour_type: odourType as OdourType,
      frequency,
      intensity,
      offensiveness,
      duration: duration ? parseInt(duration) : undefined,
      location_impact: locationImpact || undefined,
      source_suspected: sourceSuspected || undefined,
      notes: notes || undefined,
      corrective_actions: correctiveActions || undefined,
      follow_up_date: followUpDate || undefined,
      follow_up_notes: followUpNotes || undefined,
      wind_speed: weather?.wind_speed,
      wind_direction: weather?.wind_direction,
      wind_direction_text: weather?.wind_direction_text,
      temperature: weather?.temperature,
      humidity: weather?.humidity,
      pressure: weather?.pressure,
      weather_description: weather?.weather_description,
      weather_fetched_at: weather?.fetched_at,
    });

    handleClose();
  };

  const handleClose = () => {
    setOdourType('');
    setFrequency(null);
    setIntensity(null);
    setOffensiveness(null);
    setDuration('');
    setLocationImpact('');
    setSourceSuspected('');
    setNotes('');
    setCorrectiveActions('');
    setFollowUpDate('');
    setFollowUpNotes('');
    setWeather(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Record Odour Incident
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Weather Data Card */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Weather Conditions</h4>
              {fetchingWeather && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            
            {weather ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-primary" />
                  <div className="text-sm">
                    <p className="text-muted-foreground">Wind</p>
                    <p className="font-medium">{weather.wind_speed} m/s {weather.wind_direction_text}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-primary" />
                  <div className="text-sm">
                    <p className="text-muted-foreground">Temp</p>
                    <p className="font-medium">{weather.temperature}°C</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-primary" />
                  <div className="text-sm">
                    <p className="text-muted-foreground">Humidity</p>
                    <p className="font-medium">{weather.humidity}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-primary" />
                  <div className="text-sm">
                    <p className="text-muted-foreground">Pressure</p>
                    <p className="font-medium">{weather.pressure} hPa</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {siteMap?.latitude ? 'Fetching weather data...' : 'No GPS coordinates - add coordinates to site map to enable weather auto-fetch'}
              </p>
            )}
          </div>

          {/* Odour Type */}
          <div className="space-y-2">
            <Label>Odour Type *</Label>
            <Select value={odourType} onValueChange={(v) => setOdourType(v as OdourType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select odour type" />
              </SelectTrigger>
              <SelectContent>
                {ODOUR_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* FIDOL Scale */}
          <div className="space-y-4">
            <h4 className="font-semibold">FIDOL Assessment</h4>
            
            {/* Frequency */}
            <div className="space-y-2">
              <Label>Frequency</Label>
              <div className="flex flex-wrap gap-2">
                {FIDOL_SCALE.frequency.map((item) => (
                  <Button
                    key={item.value}
                    type="button"
                    variant={frequency === item.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFrequency(item.value)}
                    className="flex-1 min-w-[80px]"
                  >
                    {item.value}
                  </Button>
                ))}
              </div>
              {frequency && (
                <p className="text-xs text-muted-foreground">
                  {FIDOL_SCALE.frequency.find(f => f.value === frequency)?.label}: {FIDOL_SCALE.frequency.find(f => f.value === frequency)?.description}
                </p>
              )}
            </div>

            {/* Intensity */}
            <div className="space-y-2">
              <Label>Intensity</Label>
              <div className="flex flex-wrap gap-2">
                {FIDOL_SCALE.intensity.map((item) => (
                  <Button
                    key={item.value}
                    type="button"
                    variant={intensity === item.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIntensity(item.value)}
                    className="flex-1 min-w-[80px]"
                  >
                    {item.value}
                  </Button>
                ))}
              </div>
              {intensity && (
                <p className="text-xs text-muted-foreground">
                  {FIDOL_SCALE.intensity.find(i => i.value === intensity)?.label}: {FIDOL_SCALE.intensity.find(i => i.value === intensity)?.description}
                </p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="How long did the odour last?"
              />
            </div>

            {/* Offensiveness */}
            <div className="space-y-2">
              <Label>Offensiveness</Label>
              <div className="flex flex-wrap gap-2">
                {FIDOL_SCALE.offensiveness.map((item) => (
                  <Button
                    key={item.value}
                    type="button"
                    variant={offensiveness === item.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOffensiveness(item.value)}
                    className="flex-1 min-w-[80px]"
                  >
                    {item.value}
                  </Button>
                ))}
              </div>
              {offensiveness && (
                <p className="text-xs text-muted-foreground">
                  {FIDOL_SCALE.offensiveness.find(o => o.value === offensiveness)?.label}: {FIDOL_SCALE.offensiveness.find(o => o.value === offensiveness)?.description}
                </p>
              )}
            </div>

            {/* Location Impact */}
            <div className="space-y-2">
              <Label htmlFor="locationImpact">Location/Area Affected</Label>
              <Input
                id="locationImpact"
                value={locationImpact}
                onChange={(e) => setLocationImpact(e.target.value)}
                placeholder="e.g., Eastern fence line, Nearby residential area"
              />
            </div>
          </div>

          {/* Source & Notes */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source">Suspected Source</Label>
              <Input
                id="source"
                value={sourceSuspected}
                onChange={(e) => setSourceSuspected(e.target.value)}
                placeholder="e.g., Primary clarifier, Sludge holding tank"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any other observations..."
                rows={2}
              />
            </div>
          </div>

          {/* Corrective Actions */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold">Corrective Actions & Follow-up</h4>
            
            <div className="space-y-2">
              <Label htmlFor="corrective">Corrective Actions Taken</Label>
              <Textarea
                id="corrective"
                value={correctiveActions}
                onChange={(e) => setCorrectiveActions(e.target.value)}
                placeholder="What actions were taken to address the odour?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="followup-date">Follow-up Date</Label>
                <Input
                  id="followup-date"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="followup-notes">Follow-up Notes</Label>
                <Input
                  id="followup-notes"
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="What to check on follow-up"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!odourType || createIncident.isPending}>
              {createIncident.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                'Record Incident'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
