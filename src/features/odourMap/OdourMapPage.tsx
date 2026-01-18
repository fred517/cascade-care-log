import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";

import { useGeolocation } from "@/hooks/useGeolocation";
import { listIncidents, type OdourIncident } from "@/features/odourMap/odourIncidents";
import { loadSiteMap, uploadSiteMap } from "@/features/odourMap/siteMapStorage";
import { useCreateOdourIncident } from "@/hooks/useOdourMapping";
import { useSite } from "@/hooks/useSite";
import { useAuth } from "@/hooks/useAuth";

// Fix default marker icon bundling issues in many Vite setups
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Click-to-set marker
function ClickPicker(props: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      props.onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function OdourMapPage() {
  const { site } = useSite();
  const siteId = site?.id;
  const orgId = site?.org_id;
  const { user } = useAuth();
  const geo = useGeolocation();
  const createIncidentMutation = useCreateOdourIncident();

  const [siteMapUrl, setSiteMapUrl] = useState<string | null>(null);
  const [siteMapName, setSiteMapName] = useState<string | null>(null);

  const [incidents, setIncidents] = useState<OdourIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMap, setSavingMap] = useState(false);
  const [creating, setCreating] = useState(false);

  // Incident draft
  const [draftLat, setDraftLat] = useState<number | null>(null);
  const [draftLng, setDraftLng] = useState<number | null>(null);
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [intensity, setIntensity] = useState(3);
  const [description, setDescription] = useState("");

  const draftReady = useMemo(() => {
    return draftLat != null && draftLng != null && description.trim().length > 0;
  }, [draftLat, draftLng, description]);

  // Load persisted site map + incidents
  useEffect(() => {
    if (!siteId || !orgId) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        // Load map
        const { record, signedUrl } = await loadSiteMap({ orgId: orgId!, siteId: siteId! });
        if (!cancelled && record) {
          setSiteMapUrl(signedUrl ?? record.image_url);
          setSiteMapName(record.name ?? null);
        }

        // Load incidents
        const list = await listIncidents({ orgId: orgId!, siteId: siteId! });
        if (!cancelled) setIncidents(list);
      } catch (e: unknown) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [siteId, orgId]);

  async function onUploadMap(file: File) {
    if (!siteId || !orgId || !user?.id) return;
    setSavingMap(true);
    try {
      const rec = await uploadSiteMap({ orgId, siteId, createdBy: user.id, file });
      setSiteMapUrl(rec.image_url);
      setSiteMapName(rec.name);
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to upload site map.";
      alert(msg);
    } finally {
      setSavingMap(false);
    }
  }

  async function useMyLocation() {
    const got = await geo.request();
    if (got) {
      setDraftLat(got.lat);
      setDraftLng(got.lng);
    }
  }

  async function submitIncident() {
    if (!draftReady || !siteId || !orgId) return;

    setCreating(true);
    try {
      await createIncidentMutation.mutateAsync({
        org_id: orgId,
        site_id: siteId,
        occurred_at: new Date(occurredAt).toISOString(),
        lat: draftLat!,
        lng: draftLng!,
        intensity,
        description: description.trim(),
      });

      // Refresh incidents list
      const list = await listIncidents({ orgId, siteId });
      setIncidents(list);

      // Reset draft
      setDescription("");
      setIntensity(3);
      setOccurredAt(new Date().toISOString().slice(0, 16));
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to create incident.";
      alert(msg);
    } finally {
      setCreating(false);
    }
  }

  const center = useMemo(() => {
    if (draftLat != null && draftLng != null) return [draftLat, draftLng] as [number, number];
    if (incidents[0]) return [incidents[0].lat, incidents[0].lng] as [number, number];
    if (geo.coords) return [geo.coords.lat, geo.coords.lng] as [number, number];
    // Default fallback: Brisbane
    return [-27.4698, 153.0251] as [number, number];
  }, [draftLat, draftLng, incidents, geo.coords]);

  if (!siteId) {
    return (
      <div className="p-6">
        <div className="text-muted-foreground">No site selected. Please select a site first.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Odour Mapping</h1>
          <p className="text-sm text-muted-foreground">
            Click on the map to record odour incidents at specific locations.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
          {savingMap ? "Uploading..." : "Upload Site Map"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUploadMap(f);
            }}
          />
        </label>
      </div>

      {/* Site map preview */}
      {siteMapUrl && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Current site map: <span className="font-medium">{siteMapName || "Uploaded"}</span>
          </p>
          <div className="max-h-48 overflow-hidden rounded-lg border">
            <img
              src={siteMapUrl}
              alt="Site map"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: incident form */}
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">New Odour Incident</h2>

          <div className="space-y-4">
            <button
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              onClick={() => void useMyLocation()}
              disabled={geo.isRequesting}
              type="button"
            >
              {geo.isRequesting ? "Getting location..." : "📍 Use my location"}
            </button>

            {geo.error && (
              <p className="text-sm text-destructive">{geo.error}</p>
            )}

            <p className="text-xs text-muted-foreground">
              Tip: Click on the map to set the incident location.
            </p>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-muted/50 p-2">
                <span className="text-muted-foreground">Lat: </span>
                {draftLat != null ? (
                  <span className="font-mono">{draftLat.toFixed(6)}</span>
                ) : (
                  <span className="italic text-muted-foreground">not set</span>
                )}
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <span className="text-muted-foreground">Lng: </span>
                {draftLng != null ? (
                  <span className="font-mono">{draftLng.toFixed(6)}</span>
                ) : (
                  <span className="italic text-muted-foreground">not set</span>
                )}
              </div>
            </div>

            <label className="block text-sm">
              <span className="font-medium">Occurred at</span>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </label>

            <label className="block text-sm">
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

            <label className="block text-sm">
              <span className="font-medium">Description (required)</span>
              <textarea
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did it smell like? Where? Any notes?"
              />
            </label>

            <button
              className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              onClick={() => void submitIncident()}
              disabled={!draftReady || creating}
              type="button"
            >
              {creating ? "Creating..." : "Create Incident"}
            </button>
          </div>
        </div>

        {/* Right: map + incidents */}
        <div className="space-y-4 lg:col-span-2">
          <div className="overflow-hidden rounded-xl border">
            <div className="h-[520px]">
              <MapContainer center={center} zoom={16} className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <ClickPicker
                  onPick={(lat, lng) => {
                    setDraftLat(lat);
                    setDraftLng(lng);
                  }}
                />

                {draftLat != null && draftLng != null && (
                  <Marker position={[draftLat, draftLng]}>
                    <Popup>New incident location</Popup>
                  </Marker>
                )}

                {incidents.map((i) => (
                  <Marker key={i.id} position={[i.lat, i.lng]}>
                    <Popup>
                      <div className="text-sm font-semibold">Intensity: {i.intensity}/5</div>
                      <div className="text-xs">{new Date(i.occurred_at).toLocaleString()}</div>
                      <div className="mt-2 text-sm">{i.description}</div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* Recent incidents list */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 font-semibold">Recent Incidents</h3>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : incidents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No incidents recorded yet.</div>
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
                    <div className="mt-1 text-xs text-muted-foreground">
                      ({i.lat.toFixed(5)}, {i.lng.toFixed(5)})
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
