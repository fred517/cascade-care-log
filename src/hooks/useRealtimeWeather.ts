import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RealtimeWeather {
  wind_speed: number;
  wind_direction: number;
  wind_direction_text: string;
  temperature: number;
  humidity: number;
  pressure: number;
  weather_description: string;
  weather_icon: string;
  feels_like: number;
  visibility: number;
  clouds: number;
  fetched_at: string;
}

export function useRealtimeWeather() {
  const [weather, setWeather] = useState<RealtimeWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async (latitude: number, longitude: number) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-weather", {
        body: { latitude, longitude },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setWeather(data as RealtimeWeather);
      return data as RealtimeWeather;
    } catch (err: any) {
      const message = err?.message || "Failed to fetch weather";
      setError(message);
      console.error("Weather fetch error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { weather, loading, error, fetchWeather };
}
