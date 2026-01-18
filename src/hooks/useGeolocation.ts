import { useCallback, useEffect, useRef, useState } from "react";

export type GeoCoords = { lat: number; lng: number; accuracyMeters?: number };

export function useGeolocation() {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const request = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported on this browser/device.");
      return null;
    }

    setIsRequesting(true);
    setError(null);

    const opts: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    };

    const result = await new Promise<GeoCoords | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mounted.current) return resolve(null);
          const next = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyMeters: pos.coords.accuracy,
          };
          setCoords(next);
          resolve(next);
        },
        (err) => {
          if (!mounted.current) return resolve(null);
          let msg = "Unable to get your location.";
          if (err.code === err.PERMISSION_DENIED) {
            msg =
              "Location permission denied. Enable it in browser settings, or pick the location on the map.";
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = "Location unavailable. Try again, or pick the location on the map.";
          } else if (err.code === err.TIMEOUT) {
            msg = "Location request timed out. Try again, or pick the location on the map.";
          }
          setError(msg);
          resolve(null);
        },
        opts
      );
    });

    if (mounted.current) setIsRequesting(false);
    return result;
  }, []);

  return { coords, error, isRequesting, request };
}
