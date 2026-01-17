import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WeatherRequest {
  latitude: number;
  longitude: number;
}

interface WeatherResponse {
  wind_speed: number;
  wind_direction: number;
  wind_direction_text: string;
  temperature: number;
  humidity: number;
  pressure: number;
  weather_description: string;
  fetched_at: string;
}

function getWindDirectionText(degrees: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

function getWeatherDescription(weatherCode: number): string {
  const descriptions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return descriptions[weatherCode] || "Unknown";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude }: WeatherRequest = await req.json();

    if (!latitude || !longitude) {
      throw new Error("Latitude and longitude are required");
    }

    console.log(`Fetching weather for coordinates: ${latitude}, ${longitude}`);

    // Using Open-Meteo API (free, no API key required)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Open-Meteo API error:", errorText);
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Weather data received:", JSON.stringify(data));

    const current = data.current;
    const windDirection = current.wind_direction_10m ?? 0;

    const weatherResponse: WeatherResponse = {
      wind_speed: current.wind_speed_10m ?? 0,
      wind_direction: windDirection,
      wind_direction_text: getWindDirectionText(windDirection),
      temperature: current.temperature_2m ?? 0,
      humidity: current.relative_humidity_2m ?? 0,
      pressure: current.pressure_msl ?? 0,
      weather_description: getWeatherDescription(current.weather_code ?? 0),
      fetched_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(weatherResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in get-weather function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
