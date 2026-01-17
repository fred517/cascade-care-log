import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SiteWithCoords {
  site_id: string;
  latitude: number;
  longitude: number;
}

interface WeatherData {
  wind_speed_mps: number;
  wind_direction_deg: number;
  temperature_c: number;
}

async function fetchWeatherForLocation(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    // Using Open-Meteo API (free, no API key required)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Open-Meteo API error for ${lat},${lon}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const current = data.current;

    return {
      // Open-Meteo returns wind in km/h, convert to m/s
      wind_speed_mps: (current.wind_speed_10m ?? 0) / 3.6,
      wind_direction_deg: current.wind_direction_10m ?? 0,
      temperature_c: current.temperature_2m ?? 0,
    };
  } catch (error) {
    console.error(`Error fetching weather for ${lat},${lon}:`, error);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching sites with coordinates from site_maps...");

    // Get all site_maps with coordinates (unique by site_id)
    const { data: siteMaps, error: siteMapsError } = await supabase
      .from("site_maps")
      .select("site_id, latitude, longitude")
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (siteMapsError) {
      console.error("Error fetching site_maps:", siteMapsError);
      throw new Error(`Failed to fetch site maps: ${siteMapsError.message}`);
    }

    if (!siteMaps || siteMaps.length === 0) {
      console.log("No sites with coordinates found");
      return new Response(
        JSON.stringify({ message: "No sites with coordinates found", snapshots_created: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Deduplicate by site_id (use first map's coords for each site)
    const uniqueSites = new Map<string, SiteWithCoords>();
    for (const map of siteMaps) {
      if (!uniqueSites.has(map.site_id)) {
        uniqueSites.set(map.site_id, {
          site_id: map.site_id,
          latitude: map.latitude,
          longitude: map.longitude,
        });
      }
    }

    console.log(`Found ${uniqueSites.size} unique sites with coordinates`);

    const recordedAt = new Date().toISOString();
    const snapshots: Array<{
      site_id: string;
      recorded_at: string;
      wind_speed_mps: number;
      wind_direction_deg: number;
      temperature_c: number;
    }> = [];

    // Fetch weather for each site
    for (const [siteId, site] of uniqueSites) {
      console.log(`Fetching weather for site ${siteId} at ${site.latitude},${site.longitude}`);
      
      const weather = await fetchWeatherForLocation(site.latitude, site.longitude);
      
      if (weather) {
        snapshots.push({
          site_id: siteId,
          recorded_at: recordedAt,
          wind_speed_mps: weather.wind_speed_mps,
          wind_direction_deg: weather.wind_direction_deg,
          temperature_c: weather.temperature_c,
        });
        console.log(`Weather for site ${siteId}: ${JSON.stringify(weather)}`);
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    if (snapshots.length === 0) {
      console.log("No weather data fetched");
      return new Response(
        JSON.stringify({ message: "Failed to fetch weather data", snapshots_created: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Insert weather snapshots
    const { data: insertedData, error: insertError } = await supabase
      .from("weather_snapshots")
      .insert(snapshots)
      .select();

    if (insertError) {
      console.error("Error inserting weather snapshots:", insertError);
      throw new Error(`Failed to insert snapshots: ${insertError.message}`);
    }

    console.log(`Successfully created ${insertedData?.length || 0} weather snapshots`);

    return new Response(
      JSON.stringify({
        message: "Weather snapshots created successfully",
        snapshots_created: insertedData?.length || 0,
        recorded_at: recordedAt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in fetch-weather-snapshots:", error);
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
