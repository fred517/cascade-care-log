import { useState, useEffect } from 'react';
import { Wind, Thermometer, Droplets, Gauge, MapPin, Loader2, Navigation, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateOdourReport, type OdourReportWeather, type OdourReportOdour } from '@/hooks/useOdourReports';
import { useFetchWeather } from '@/hooks/useOdourMapping';
import { ODOUR_TYPES, FIDOL_SCALE, type OdourType } from '@/types/odour';
import { cn } from '@/lib/utils';

interface OdourReportFormProps {
  open: boolean;
  onClose: () => void;
}

export default function OdourReportForm({ open, onClose }: OdourReportFormProps) {
  // Location state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Weather state
  const [weather, setWeather] = useState<OdourReportWeather | null>(null);
  const [fetchingWeather, setFetchingWeather] = useState(false);

  // Odour assessment state
  const [odourType, setOdourType] = useState<OdourType | ''>('');
  const [frequency, setFrequency] = useState<number | null>(null);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [offensiveness, setOffensiveness] = useState<number | null>(null);
  const [duration, setDuration] = useState('');
  const [locationImpact, setLocationImpact] = useState('');
  const [sourceSuspected, setSourceSuspected] = useState('');
  const [notes, setNotes] = useState('');
  const [observedAt, setObservedAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  const createReport = useCreateOdourReport();
  const fetchWeather = useFetchWeather();

  // Get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGettingLocation(false);
      },
      (error) => {
        setGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied. Please enable location permissions.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out.');
            break;
          default:
            setLocationError('An unknown error occurred.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Auto-get location when form opens
  useEffect(() => {
    if (open && !latitude && !longitude) {
      getCurrentLocation();
    }
  }, [open]);

  // Fetch weather when we have coordinates
  useEffect(() => {
    if (latitude && longitude && !weather && !fetchingWeather) {
      setFetchingWeather(true);
      fetchWeather.mutateAsync({ latitude, longitude })
        .then((data) => {
          setWeather(data as OdourReportWeather);
        })
        .catch(() => {
          // Error handled by hook
        })
        .finally(() => {
          setFetchingWeather(false);
        });
    }
  }, [latitude, longitude]);

  const handleRefreshWeather = () => {
    if (latitude && longitude) {
      setFetchingWeather(true);
      setWeather(null);
      fetchWeather.mutateAsync({ latitude, longitude })
        .then((data) => {
          setWeather(data as OdourReportWeather);
        })
        .finally(() => {
          setFetchingWeather(false);
        });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!latitude || !longitude) {
      setLocationError('Location is required to submit a report');
      return;
    }
    
    if (!odourType || !frequency || !intensity || !offensiveness) {
      return;
    }

    if (!weather) {
      return;
    }

    const odourData: OdourReportOdour = {
      type: odourType,
      intensity,
      frequency,
      duration: duration ? parseInt(duration) : null,
      offensiveness,
      location_impact: locationImpact || null,
      source_suspected: sourceSuspected || null,
      notes: notes || null,
    };

    await createReport.mutateAsync({
      observed_at: new Date(observedAt).toISOString(),
      latitude,
      longitude,
      weather,
      odour: odourData,
    });

    handleClose();
  };

  const handleClose = () => {
    setLatitude(null);
    setLongitude(null);
    setLocationError(null);
    setWeather(null);
    setOdourType('');
    setFrequency(null);
    setIntensity(null);
    setOffensiveness(null);
    setDuration('');
    setLocationImpact('');
    setSourceSuspected('');
    setNotes('');
    setObservedAt(() => {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      return now.toISOString().slice(0, 16);
    });
    onClose();
  };

  const isFormValid = latitude && longitude && weather && odourType && frequency && intensity && offensiveness;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Submit Odour Report
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date/Time */}
          <div className="space-y-2">
            <Label htmlFor="observed-at">Observation Date & Time</Label>
            <Input
              id="observed-at"
              type="datetime-local"
              value={observedAt}
              onChange={(e) => setObservedAt(e.target.value)}
            />
          </div>

          {/* Location Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {latitude && longitude ? (
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <p className="font-medium">GPS Coordinates</p>
                    <p className="text-muted-foreground">
                      {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                  >
                    {gettingLocation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {locationError && (
                    <p className="text-sm text-destructive">{locationError}</p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="w-full"
                  >
                    {gettingLocation ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Getting location...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 mr-2" />
                        Get Current Location
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Manual coordinate entry */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1">
                  <Label htmlFor="lat" className="text-xs">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    placeholder="e.g., 51.5074"
                    value={latitude ?? ''}
                    onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lng" className="text-xs">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    placeholder="e.g., -0.1278"
                    value={longitude ?? ''}
                    onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weather Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4" />
                  Weather Conditions
                </div>
                {weather && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshWeather}
                    disabled={fetchingWeather}
                  >
                    {fetchingWeather ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fetchingWeather ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Fetching weather data...</span>
                </div>
              ) : weather ? (
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
                  {latitude && longitude ? 'Weather data will be fetched automatically' : 'Set location to fetch weather data'}
                </p>
              )}
            </CardContent>
          </Card>

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
            <h4 className="font-semibold">FIDOL Assessment *</h4>
            
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
                    className="flex-1 min-w-[60px]"
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
                    className="flex-1 min-w-[60px]"
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
                    className="flex-1 min-w-[60px]"
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

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid || createReport.isPending}>
              {createReport.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
