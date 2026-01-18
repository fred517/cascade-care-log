// Config helper for environment variables
// Note: VITE_MAPBOX_TOKEN is stored as a secret and not available in browser
// The map currently uses OpenStreetMap tiles which don't require a token

function getEnv(name: string): string | undefined {
  return (import.meta as any).env?.[name];
}

export const CONFIG = {
  // Mapbox token - optional, falls back to OpenStreetMap if not available
  MAPBOX_TOKEN: getEnv("VITE_MAPBOX_TOKEN"),
  // Weather API is handled via edge function with server-side secret
};
