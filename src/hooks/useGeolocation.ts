import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type GeoPermissionState = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

export type GeoCoords = { lat: number; lng: number; accuracyMeters?: number };

export function useGeolocation() {
  const [permission, setPermission] = useState<GeoPermissionState>("unknown");
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Best-effort permission detection (not supported everywhere)
  useEffect(() => {
    let cancelled = false;

    async function checkPermission() {
      try {
        const p = await navigator.permissions?.query?.({ name: "geolocation" } as PermissionDescriptor);
        if (!p) return;

        if (cancelled) return;
        setPermission(p.state as GeoPermissionState);

        p.onchange = () => {
          if (!mountedRef.current) return;
          setPermission(p.state as GeoPermissionState);
        };
      } catch {
        // Ignore, we'll just request and handle errors normally.
      }
    }

    if (!("geolocation" in navigator)) {
      setPermission("unsupported");
      return;
    }

    checkPermission();
    return () => {
      cancelled = true;
    };
  }, []);

  const request = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setPermission("unsupported");
      setError("Geolocation is not supported on this device/browser.");
      return null;
    }

    setIsRequesting(true);
    setError(null);

    const opts: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30_000,
    };

    const result = await new Promise<GeoCoords | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mountedRef.current) return resolve(null);
          const next: GeoCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyMeters: pos.coords.accuracy,
          };
          setCoords(next);
          setPermission("granted");
          resolve(next);
        },
        (err) => {
          if (!mountedRef.current) return resolve(null);

          // Human-friendly error mapping
          let msg = "Unable to get your location.";
          if (err.code === err.PERMISSION_DENIED) {
            msg =
              "Location permission denied. Enable location access for this site in your browser settings, or pick the incident location on the map.";
            setPermission("denied");
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg =
              "Location unavailable (GPS/network). Try again, move outdoors, or pick the incident location on the map.";
          } else if (err.code === err.TIMEOUT) {
            msg =
              "Location request timed out. Try again, or pick the incident location on the map.";
          }

          setError(msg);
          resolve(null);
        },
        opts
      );
    });

    if (mountedRef.current) setIsRequesting(false);
    return result;
  }, []);

  const value = useMemo(
    () => ({ permission, coords, error, isRequesting, request }),
    [permission, coords, error, isRequesting, request]
  );

  return value;
}
