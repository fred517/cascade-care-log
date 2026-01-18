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
  weather_icon: string;
  feels_like: number;
  visibility: number;
  clouds: number;
  fetched_at: string;
}

function getWindDirectionText(degrees: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
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

    const apiKey = Deno.env.get("OPENWEATHERMAP_API_KEY");
    if (!apiKey) {
      throw new Error("OpenWeatherMap API key not configured");
    }

    // Using OpenWeatherMap Current Weather API
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenWeatherMap API error:", errorText);
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Weather data received:", JSON.stringify(data));

    const windDirection = data.wind?.deg ?? 0;

    const weatherResponse: WeatherResponse = {
      wind_speed: data.wind?.speed ?? 0, // m/s
      wind_direction: windDirection,
      wind_direction_text: getWindDirectionText(windDirection),
      temperature: data.main?.temp ?? 0,
      humidity: data.main?.humidity ?? 0,
      pressure: data.main?.pressure ?? 0,
      weather_description: data.weather?.[0]?.description ?? "Unknown",
      weather_icon: data.weather?.[0]?.icon ?? "01d",
      feels_like: data.main?.feels_like ?? 0,
      visibility: (data.visibility ?? 10000) / 1000, // Convert to km
      clouds: data.clouds?.all ?? 0,
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
