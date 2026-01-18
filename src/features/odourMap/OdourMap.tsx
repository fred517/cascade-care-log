import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useSite } from "@/hooks/useSite";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useRealtimeWeather } from "@/hooks/useRealtimeWeather";
import { loadSiteMap, uploadSiteMap } from "@/features/odourMap/siteMapStorage";
import { createIncident, listIncidents, type OdourIncident } from "@/features/odourMap/odourIncidents";
import { Cloud, Droplets, Eye, Thermometer, Wind } from "lucide-react";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function ClickPicker(props: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      props.onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function OdourMap() {
  console.log("[OdourMap] Component mounting...");
  
  const { profile } = useAuth();
  const { site, loading: siteLoading } = useSite();
  const geo = useGeolocation();
  const { weather, loading: weatherLoading, error: weatherError, fetchWeather } = useRealtimeWeather();

  // Get orgId from site (preferred) or profile as fallback
  const orgId = site?.org_id || (profile as any)?.org_id;
  const siteId = site?.id;
  
  console.log("[OdourMap] Context:", { orgId, siteId, siteLoading, hasProfile: !!profile, hasSite: !!site });

  const [siteMapUrl, setSiteMapUrl] = useState<string | null>(null);
  const [siteMapName, setSiteMapName] = useState<string | null>(null);

  const [incidents, setIncidents] = useState<OdourIncident[]>([]);
  const [loading, setLoading] = useState(true);

  const [draftLat, setDraftLat] = useState<number | null>(null);
  const [draftLng, setDraftLng] = useState<number | null>(null);
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [intensity, setIntensity] = useState(3);
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");

  const ready =
    orgId && siteId && draftLat != null && draftLng != null && description.trim().length > 0;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      console.log("[OdourMap] load() called", { siteId, orgId });
      
      if (!siteId) {
        console.log("[OdourMap] No siteId, skipping load");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (orgId) {
          console.log("[OdourMap] Loading site map...");
          const map = await loadSiteMap({ orgId, siteId });
          console.log("[OdourMap] Site map loaded:", map);
          if (!cancelled) {
            setSiteMapUrl(map.signedUrl);
            setSiteMapName(map.record?.file_name ?? null);
          }

          console.log("[OdourMap] Loading incidents...");
          const list = await listIncidents({ orgId, siteId });
          console.log("[OdourMap] Incidents loaded:", list.length);
          if (!cancelled) setIncidents(list);
        }
      } catch (err) {
        console.error("[OdourMap] Error loading odour map data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [orgId, siteId]);

  // Fetch weather when we have a center location
  useEffect(() => {
    const lat = draftLat ?? incidents[0]?.lat ?? -27.4698;
    const lng = draftLng ?? incidents[0]?.lng ?? 153.0251;
    fetchWeather(lat, lng);
  }, [siteId]); // Fetch once when site loads

  const center = useMemo(() => {
    if (draftLat != null && draftLng != null) return [draftLat, draftLng] as [number, number];
    if (incidents[0]) return [incidents[0].lat, incidents[0].lng] as [number, number];
    return [-27.4698, 153.0251] as [number, number];
  }, [draftLat, draftLng, incidents]);

  // Show loading state while site is being fetched
  if (siteLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-12">
          <div className="text-muted-foreground">Loading site data...</div>
        </div>
      </AppLayout>
    );
  }

  // Show message if no site is available
  if (!siteId) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="rounded-xl border bg-card p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">No Site Selected</h2>
            <p className="text-muted-foreground">
              Please ensure you have access to at least one site to use the odour mapping feature.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  async function onUpload(file: File) {
    if (!orgId || !siteId) return;
    const rec = await uploadSiteMap({ orgId, siteId, file });
    const map = await loadSiteMap({ orgId, siteId });
    setSiteMapUrl(map.signedUrl);
    setSiteMapName(rec.file_name);
  }

  async function useMyLocation() {
    const got = await geo.request();
    if (got) {
      setDraftLat(got.lat);
      setDraftLng(got.lng);
    }
  }

  async function submit() {
    if (!ready) return;

    // Fetch fresh weather data for the incident location
    let currentWeather = weather;
    if (draftLat != null && draftLng != null) {
      const freshWeather = await fetchWeather(draftLat, draftLng);
      if (freshWeather) {
        currentWeather = freshWeather;
      }
    }

    const created = await createIncident({
      org_id: orgId,
      site_id: siteId,
      occurred_at: new Date(occurredAt).toISOString(),
      lat: draftLat!,
      lng: draftLng!,
      intensity,
      description: description.trim(),
      source: source.trim() || null,
      weather: currentWeather,
    });

    setIncidents((prev) => [created, ...prev]);

    setDescription("");
    setSource("");
    setIntensity(3);
    setOccurredAt(new Date().toISOString().slice(0, 16));
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Odour Mapping</h1>
              <p className="text-sm text-muted-foreground">
                Site map persists per site. Incidents allow GPS or manual selection.
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
              Upload Site Map
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUpload(f);
                }}
              />
            </label>
          </div>

          <p className="text-sm text-muted-foreground">
            Current site map:{" "}
            <span className="font-medium">{siteMapName ?? "None uploaded"}</span>
          </p>

          {siteMapUrl ? (
            <div className="max-h-48 overflow-hidden rounded-lg border">
              <img src={siteMapUrl} alt="Site map" className="w-full object-contain" />
            </div>
          ) : null}
        </div>

        {/* Real-time Weather Panel */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Current Weather
            </h2>
            <button
              onClick={() => {
                const lat = draftLat ?? incidents[0]?.lat ?? -27.4698;
                const lng = draftLng ?? incidents[0]?.lng ?? 153.0251;
                fetchWeather(lat, lng);
              }}
              disabled={weatherLoading}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {weatherLoading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {weatherError && (
            <div className="text-sm text-destructive mb-2">{weatherError}</div>
          )}

          {weather ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                <Thermometer className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Temperature</div>
                  <div className="font-semibold">{weather.temperature.toFixed(1)}°C</div>
                  <div className="text-xs text-muted-foreground">
                    Feels like {weather.feels_like.toFixed(1)}°C
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                <Wind className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Wind</div>
                  <div className="font-semibold">{weather.wind_speed.toFixed(1)} m/s</div>
                  <div className="text-xs text-muted-foreground">
                    {weather.wind_direction_text} ({weather.wind_direction}°)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                <Droplets className="h-5 w-5 text-cyan-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Humidity</div>
                  <div className="font-semibold">{weather.humidity}%</div>
                  <div className="text-xs text-muted-foreground">
                    {weather.pressure} hPa
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                <Eye className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Visibility</div>
                  <div className="font-semibold">{weather.visibility.toFixed(1)} km</div>
                  <div className="text-xs text-muted-foreground">
                    Clouds: {weather.clouds}%
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                <img
                  src={`https://openweathermap.org/img/wn/${weather.weather_icon}@2x.png`}
                  alt={weather.weather_description}
                  className="h-10 w-10"
                />
                <div>
                  <div className="text-xs text-muted-foreground">Conditions</div>
                  <div className="font-semibold capitalize">{weather.weather_description}</div>
                </div>
              </div>
            </div>
          ) : weatherLoading ? (
            <div className="text-sm text-muted-foreground">Loading weather data...</div>
          ) : (
            <div className="text-sm text-muted-foreground">No weather data available</div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <h2 className="text-lg font-semibold">New Odour Incident</h2>

            <button
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              onClick={() => void useMyLocation()}
              disabled={geo.isRequesting}
              type="button"
            >
              {geo.isRequesting ? "Getting location..." : "📍 Use my location"}
            </button>

            {geo.error ? <p className="text-sm text-destructive">{geo.error}</p> : null}

            <p className="text-xs text-muted-foreground">
              If GPS fails, click the map to set the incident location.
            </p>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-muted/50 p-2">
                <span className="text-muted-foreground">Lat: </span>
                <span className="font-mono">{draftLat != null ? draftLat.toFixed(6) : "not set"}</span>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <span className="text-muted-foreground">Lng: </span>
                <span className="font-mono">{draftLng != null ? draftLng.toFixed(6) : "not set"}</span>
              </div>
            </div>

            <label className="text-sm block">
              <span className="font-medium">Occurred at</span>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </label>

            <label className="text-sm block">
              <span className="font-medium">Intensity (1-5)</span>
              <input
                type="range"
                min={1}
                max={5}
                className="mt-1 w-full"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 - Faint</span>
                <span className="font-semibold">{intensity}</span>
                <span>5 - Strong</span>
              </div>
            </label>

            <label className="text-sm block">
              <span className="font-medium">Description (required)</span>
              <textarea
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did it smell like? Where? Any notes?"
              />
            </label>

            <label className="text-sm block">
              <span className="font-medium">Suspected source (optional)</span>
              <input
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. inlet works, sludge handling"
              />
            </label>

            <button
              className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              disabled={!ready}
              onClick={() => void submit()}
              type="button"
            >
              Create incident
            </button>

            {!orgId || !siteId ? (
              <div className="text-xs text-destructive">
                Missing orgId/siteId context. Wire org_id into `site` or `profile`.
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border overflow-hidden">
              <div className="px-4 py-2 text-sm text-muted-foreground bg-muted/30">
                Click anywhere on the map to set the incident location.
              </div>

              <div className="h-[520px]">
                <MapContainer center={center} zoom={16} className="h-full w-full">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <ClickPicker onPick={(lat, lng) => { setDraftLat(lat); setDraftLng(lng); }} />

                  {draftLat != null && draftLng != null ? (
                    <Marker position={[draftLat, draftLng]}>
                      <Popup>New incident location</Popup>
                    </Marker>
                  ) : null}

                  {incidents.map((i) => (
                    <Marker key={i.id} position={[i.lat, i.lng]}>
                      <Popup>
                        <div className="text-sm font-semibold">Intensity: {i.intensity}/5</div>
                        <div className="text-xs">{new Date(i.occurred_at).toLocaleString()}</div>
                        <div className="mt-2 text-sm">{i.description}</div>
                        {i.source ? (
                          <div className="mt-1 text-xs text-muted-foreground">Source: {i.source}</div>
                        ) : null}
                        {(i.temperature != null || i.wind_speed != null) && (
                          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                            {i.temperature != null && <span>{i.temperature.toFixed(1)}°C</span>}
                            {i.wind_speed != null && (
                              <span className="ml-2">
                                💨 {i.wind_speed.toFixed(1)} m/s
                                {i.wind_dir != null && ` (${i.wind_dir}°)`}
                              </span>
                            )}
                            {i.humidity != null && <span className="ml-2">💧 {i.humidity}%</span>}
                          </div>
                        )}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="font-semibold mb-3">Recent incidents</div>
              {loading || siteLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : incidents.length === 0 ? (
                <div className="text-sm text-muted-foreground">No incidents yet.</div>
              ) : (
                <ul className="space-y-2">
                  {incidents.slice(0, 8).map((i) => (
                    <li key={i.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">Intensity {i.intensity}/5</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(i.occurred_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="mt-1 text-sm">{i.description}</div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>({i.lat.toFixed(5)}, {i.lng.toFixed(5)})</span>
                        {i.temperature != null && <span>🌡️ {i.temperature.toFixed(1)}°C</span>}
                        {i.wind_speed != null && <span>💨 {i.wind_speed.toFixed(1)} m/s</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
