function requireEnv(name: string): string {
  const v = (import.meta as any).env?.[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export const CONFIG = {
  MAPBOX_TOKEN: requireEnv("VITE_MAPBOX_TOKEN"),
  // WEATHER_KEY: requireEnv("VITE_WEATHER_KEY"),
};
