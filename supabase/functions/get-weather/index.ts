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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENWEATHERMAP_API_KEY");
    if (!apiKey) {
      console.error("OPENWEATHERMAP_API_KEY not configured");
      throw new Error("Weather API not configured");
    }

    const { latitude, longitude }: WeatherRequest = await req.json();

    if (!latitude || !longitude) {
      throw new Error("Latitude and longitude are required");
    }

    console.log(`Fetching weather for coordinates: ${latitude}, ${longitude}`);

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenWeatherMap API error:", errorText);
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Weather data received:", JSON.stringify(data));

    const weatherResponse: WeatherResponse = {
      wind_speed: data.wind?.speed ?? 0,
      wind_direction: data.wind?.deg ?? 0,
      wind_direction_text: getWindDirectionText(data.wind?.deg ?? 0),
      temperature: data.main?.temp ?? 0,
      humidity: data.main?.humidity ?? 0,
      pressure: data.main?.pressure ?? 0,
      weather_description: data.weather?.[0]?.description ?? "Unknown",
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
