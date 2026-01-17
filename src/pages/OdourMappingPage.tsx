import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createIncident, getSitemap, listIncidents, uploadSitemap, OdourIncident, SitemapRecord } from "@/lib/odourRepo";

// Replace this with your real map component.
// The important part is: call onPick(lat,lng) when the user clicks a location.
function FakeMap({
  sitemapUrl,
  onPick,
  picked,
  markers,
}: {
  sitemapUrl?: string | null;
  onPick: (lat: number, lng: number) => void;
  picked: { lat: number; lng: number } | null;
  markers: OdourIncident[];
}) {
  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 12, padding: 12, minHeight: 320 }}>
      <div style={{ fontSize: 14, marginBottom: 8 }}>
        <b>Map</b> {sitemapUrl ? `(Sitemap loaded)` : `(No sitemap yet)`}
      </div>
      <button
        onClick={() => onPick(-27.4705, 153.0260)} // Brisbane, because humans love defaults
        style={{ padding: "8px 12px", borderRadius: 10 }}
      >
        Click to pick sample point
      </button>
      <div style={{ marginTop: 10, fontSize: 13 }}>
        Picked: {picked ? `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}` : "none"}
      </div>
      <div style={{ marginTop: 10, fontSize: 13 }}>
        Incidents loaded: {markers.length}
      </div>
    </div>
  );
}

export default function OdourMappingPage() {
  const [siteId, setSiteId] = useState<string | null>(null);
  const [sitemap, setSitemap] = useState<SitemapRecord | null>(null);
  const [incidents, setIncidents] = useState<OdourIncident[]>([]);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [intensity, setIntensity] = useState<number>(5);
  const [character, setCharacter] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sitemapUrl = sitemap?.public_url ?? null;

  // Get user ID as site ID on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (userId) setSiteId(userId);
    });
  }, []);

  async function refreshAll(id: string) {
    const [sm, inc] = await Promise.all([getSitemap(id), listIncidents(id)]);
    setSitemap(sm);
    setIncidents(inc);
  }

  useEffect(() => {
    if (!siteId) return;
    setError(null);
    refreshAll(siteId).catch((e: any) => setError(e?.message ?? String(e)));
  }, [siteId]);

  async function onUpload(file: File) {
    if (!siteId) return;
    setBusy(true);
    setError(null);
    try {
      const rec = await uploadSitemap(siteId, file);
      setSitemap(rec);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onCreateIncident() {
    if (!siteId) return;
    setBusy(true);
    setError(null);
    try {
      // If you have a weather fetcher, call it here and pass into weather:
      const weather = null;
      const created = await createIncident({
        siteId,
        lat: picked?.lat ?? NaN,
        lng: picked?.lng ?? NaN,
        intensity,
        character: character.trim() || undefined,
        notes: notes.trim() || undefined,
        weather,
      });
      setIncidents((prev) => [created, ...prev]);
      // Reset form but NOT the sitemap
      setPicked(null);
      setIntensity(5);
      setCharacter("");
      setNotes("");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!siteId) {
    return <div style={{ padding: 16 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>Odour Mapping</h2>
        <div style={{ fontSize: 13, opacity: 0.7 }}>Site: {siteId}</div>
      </div>

      {error && (
        <div style={{ background: "#ffe9e9", border: "1px solid #ffb4b4", padding: 12, borderRadius: 12 }}>
          <b>Something broke:</b> {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
        <FakeMap sitemapUrl={sitemapUrl} onPick={(lat, lng) => setPicked({ lat, lng })} picked={picked} markers={incidents} />

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Sitemap</div>
            <div style={{ fontSize: 13, marginBottom: 8, opacity: 0.8 }}>
              {sitemapUrl ? (
                <>
                  Loaded: <a href={sitemapUrl} target="_blank" rel="noreferrer">{sitemapUrl}</a>
                </>
              ) : (
                "No sitemap uploaded yet."
              )}
            </div>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf,.svg"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
              }}
            />
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "12px 0" }} />

          <div style={{ fontWeight: 600, marginBottom: 6 }}>New Incident</div>
          <div style={{ fontSize: 13, marginBottom: 8, opacity: 0.8 }}>
            Click the map to pick a location, then save.
          </div>

          <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Intensity (0–10)</label>
          <input
            type="number"
            min={0}
            max={10}
            step={1}
            value={intensity}
            disabled={busy}
            onChange={(e) => setIntensity(parseInt(e.target.value || "0", 10))}
            style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #ccc" }}
          />

          <label style={{ display: "block", fontSize: 13, margin: "10px 0 6px" }}>Character</label>
          <input
            value={character}
            disabled={busy}
            onChange={(e) => setCharacter(e.target.value)}
            placeholder="eg. septic, sulfur, compost, chemical"
            style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #ccc" }}
          />

          <label style={{ display: "block", fontSize: 13, margin: "10px 0 6px" }}>Notes</label>
          <textarea
            value={notes}
            disabled={busy}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Any operator observations..."
            style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #ccc", resize: "vertical" }}
          />

          <button
            disabled={busy}
            onClick={onCreateIncident}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #333",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Working..." : "Create Incident"}
          </button>
        </div>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Recent Incidents</div>
        {incidents.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.7 }}>None yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {incidents.slice(0, 10).map((x) => (
              <div key={x.id} style={{ padding: 10, borderRadius: 10, border: "1px solid #eee" }}>
                <div style={{ fontSize: 13 }}>
                  <b>{new Date(x.created_at).toLocaleString()}</b> · Intensity {x.intensity} · {x.lat.toFixed(5)}, {x.lng.toFixed(5)}
                </div>
                {(x.character || x.notes) && (
                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                    {x.character ? <span><b>Character:</b> {x.character} </span> : null}
                    {x.notes ? <span><b>Notes:</b> {x.notes}</span> : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
