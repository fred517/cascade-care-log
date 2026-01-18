import { useCallback, useEffect, useRef, useState } from "react";

type GeoState =
  | { status: "idle"; coords: null; error: null }
  | { status: "requesting"; coords: null; error: null }
  | { status: "granted"; coords: { lat: number; lng: number; accuracy?: number }; error: null }
  | { status: "denied"; coords: null; error: string }
  | { status: "error"; coords: null; error: string };

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    status: "idle",
    coords: null,
    error: null,
  });

  const inFlight = useRef(false);

  const request = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;

    // Hard blockers: no API or not secure
    if (typeof window === "undefined" || !navigator.geolocation) {
      setState({ status: "error", coords: null, error: "Geolocation not supported by this browser." });
      inFlight.current = false;
      return;
    }

    if (!window.isSecureContext) {
      setState({
        status: "error",
        coords: null,
        error: "Geolocation requires HTTPS (secure context).",
      });
      inFlight.current = false;
      return;
    }

    setState({ status: "requesting", coords: null, error: null });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setState({ status: "error", coords: null, error: "Browser returned invalid coordinates." });
        } else {
          setState({
            status: "granted",
            coords: { lat, lng, accuracy: pos.coords.accuracy },
            error: null,
          });
        }
        inFlight.current = false;
      },
      (err) => {
        // Surface the real reason, not "no GPS"
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it in browser site settings."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Location unavailable. Check GPS/Wi-Fi/cell signal."
              : err.code === err.TIMEOUT
                ? "Location request timed out. Try again or disable high accuracy."
                : `Location error: ${err.message || "Unknown error"}`;
        setState({ status: err.code === err.PERMISSION_DENIED ? "denied" : "error", coords: null, error: msg });
        inFlight.current = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  // Optional: auto-request once on mount
  useEffect(() => {
    request();
  }, [request]);

  return { ...state, request };
}
