import { useState, useEffect } from 'react';
import { Wind, Thermometer, Droplets, AlertTriangle, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateOdourIncident, useFetchWeather } from '@/hooks/useOdourMapping';
import { useGeolocation } from '@/hooks/useGeolocation';
import { FIDOL_SCALE, type WeatherData } from '@/types/odour';

interface OdourIncidentFormProps {
  open: boolean;
  onClose: () => void;
  clickPosition: { lat: number; lng: number } | null;
  facilityId: string;
  facilityLatLng?: { lat: number; lng: number } | null;
}

export default function OdourIncidentForm({ 
  open, 
  onClose, 
  clickPosition, 
  facilityId,
  facilityLatLng 
}: OdourIncidentFormProps) {
  const [intensity, setIntensity] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [fetchingWeather, setFetchingWeather] = useState(false);

  const geo = useGeolocation();
  const createIncident = useCreateOdourIncident();
  const fetchWeather = useFetchWeather();

  // Effective coordinates: prefer map click, fall back to GPS
  const effectivePosition = clickPosition ?? (geo.status === "granted" ? geo.coords : null);

  // Auto-fetch weather when form opens and we have coordinates
  useEffect(() => {
    if (open && facilityLatLng?.lat && facilityLatLng?.lng) {
      setFetchingWeather(true);
      fetchWeather.mutateAsync({
        latitude: facilityLatLng.lat,
        longitude: facilityLatLng.lng,
      }).then((data) => {
        setWeather(data);
      }).catch(() => {
        // Error already handled by hook
      }).finally(() => {
        setFetchingWeather(false);
      });
    }
  }, [open, facilityLatLng?.lat, facilityLatLng?.lng]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectivePosition) return;

    await createIncident.mutateAsync({
      facility_id: facilityId,
      lat: effectivePosition.lat,
      lng: effectivePosition.lng,
      intensity,
      description: description || null,
      wind_speed: weather?.wind_speed ?? null,
      wind_dir: weather?.wind_direction ?? null,
      temperature: weather?.temperature ?? null,
      humidity: weather?.humidity ?? null,
      occurred_at: new Date().toISOString(),
    });

    handleClose();
  };

  const handleClose = () => {
    setIntensity(null);
    setDescription('');
    setWeather(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-primary" />
                  <div className="text-sm">
                    <p className="text-muted-foreground">Wind</p>
                    <p className="font-medium">{weather.wind_speed} m/s</p>
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
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {facilityLatLng ? 'Fetching weather data...' : 'No GPS coordinates available'}
              </p>
            )}
          </div>

          {/* GPS Location */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Location</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={geo.request}
                disabled={geo.status === "requesting"}
              >
                <MapPin className="w-4 h-4 mr-1" />
                {geo.status === "requesting" ? "Getting location..." : "Use my location"}
              </Button>
            </div>
            
            {geo.status === "granted" && !clickPosition ? (
              <p className="text-sm">
                GPS: {geo.coords.lat.toFixed(6)}, {geo.coords.lng.toFixed(6)} 
                <span className="text-muted-foreground"> (±{geo.coords.accuracy?.toFixed(0) ?? 0}m)</span>
              </p>
            ) : clickPosition ? (
              <p className="text-sm">
                Map: {clickPosition.lat.toFixed(6)}, {clickPosition.lng.toFixed(6)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {geo.error || "Click map or use GPS to set location"}
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the odour, suspected source, observations..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createIncident.isPending || !effectivePosition}>
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
