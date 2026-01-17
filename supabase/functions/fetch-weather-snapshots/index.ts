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
  cloud_cover: number;
  is_day: boolean;
  solar_radiation: number;
}

/**
 * Calculate solar elevation angle (simplified)
 * Returns approximate solar elevation in degrees
 */
function getSolarElevation(lat: number, lon: number, date: Date): number {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const hourUTC = date.getUTCHours() + date.getUTCMinutes() / 60;
  
  // Solar declination
  const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  
  // Hour angle
  const solarNoon = 12 - lon / 15;
  const hourAngle = 15 * (hourUTC - solarNoon);
  
  // Solar elevation
  const latRad = lat * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  const haRad = hourAngle * Math.PI / 180;
  
  const sinElevation = Math.sin(latRad) * Math.sin(decRad) + 
                       Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  
  return Math.asin(sinElevation) * 180 / Math.PI;
}

/**
 * Classify incoming solar radiation based on solar elevation and cloud cover
 * Returns: 'strong', 'moderate', 'slight', or 'night'
 */
function classifySolarRadiation(solarElevation: number, cloudCover: number): string {
  if (solarElevation < 0) {
    return 'night';
  }
  
  // Clear sky factor (0-1, where 1 is clear)
  const clearFactor = 1 - (cloudCover / 100);
  
  // Effective solar intensity considering elevation and clouds
  const effectiveIntensity = Math.sin(solarElevation * Math.PI / 180) * clearFactor;
  
  if (effectiveIntensity > 0.5) return 'strong';
  if (effectiveIntensity > 0.25) return 'moderate';
  if (effectiveIntensity > 0) return 'slight';
  return 'night';
}

/**
 * Calculate Pasquill-Gifford stability class
 * 
 * Based on Turner's method using wind speed and solar radiation/cloud cover
 * 
 * Stability Classes:
 * A - Very unstable
 * B - Unstable  
 * C - Slightly unstable
 * D - Neutral
 * E - Slightly stable
 * F - Stable
 */
function calculateStabilityClass(
  windSpeedMps: number,
  solarRadiation: string,
  cloudCover: number
): string {
  // Wind speed categories (m/s)
  const ws = windSpeedMps;
  
  // Daytime stability (based on solar radiation)
  if (solarRadiation !== 'night') {
    // Strong insolation
    if (solarRadiation === 'strong') {
      if (ws < 2) return 'A';
      if (ws < 3) return 'A';
      if (ws < 5) return 'B';
      if (ws < 6) return 'C';
      return 'D';
    }
    // Moderate insolation
    if (solarRadiation === 'moderate') {
      if (ws < 2) return 'A';
      if (ws < 3) return 'B';
      if (ws < 5) return 'B';
      if (ws < 6) return 'C';
      return 'D';
    }
    // Slight insolation
    if (solarRadiation === 'slight') {
      if (ws < 2) return 'B';
      if (ws < 5) return 'C';
      return 'D';
    }
  }
  
  // Nighttime stability (based on cloud cover)
  // >50% cloud cover = cloudy, <=50% = clear
  const isCloudy = cloudCover > 50;
  
  if (isCloudy) {
    // Cloudy night - more neutral
    if (ws < 2) return 'E';
    if (ws < 3) return 'D';
    return 'D';
  } else {
    // Clear night - more stable
    if (ws < 2) return 'F';
    if (ws < 3) return 'E';
    if (ws < 5) return 'D';
    return 'D';
  }
}

async function fetchWeatherForLocation(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    // Using Open-Meteo API with additional parameters for stability calculation
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover,is_day,direct_radiation`;
    
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
      cloud_cover: current.cloud_cover ?? 0,
      is_day: current.is_day === 1,
      solar_radiation: current.direct_radiation ?? 0,
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

    const now = new Date();
    const recordedAt = now.toISOString();
    const snapshots: Array<{
      site_id: string;
      recorded_at: string;
      wind_speed_mps: number;
      wind_direction_deg: number;
      temperature_c: number;
      stability_class: string;
    }> = [];

    // Fetch weather for each site
    for (const [siteId, site] of uniqueSites) {
      console.log(`Fetching weather for site ${siteId} at ${site.latitude},${site.longitude}`);
      
      const weather = await fetchWeatherForLocation(site.latitude, site.longitude);
      
      if (weather) {
        // Calculate solar elevation for more accurate stability classification
        const solarElevation = getSolarElevation(site.latitude, site.longitude, now);
        const solarRadiation = classifySolarRadiation(solarElevation, weather.cloud_cover);
        const stabilityClass = calculateStabilityClass(
          weather.wind_speed_mps,
          solarRadiation,
          weather.cloud_cover
        );

        snapshots.push({
          site_id: siteId,
          recorded_at: recordedAt,
          wind_speed_mps: Math.round(weather.wind_speed_mps * 100) / 100,
          wind_direction_deg: weather.wind_direction_deg,
          temperature_c: weather.temperature_c,
          stability_class: stabilityClass,
        });
        
        console.log(`Site ${siteId}: wind=${weather.wind_speed_mps.toFixed(2)}m/s, ` +
          `solar=${solarRadiation}, cloud=${weather.cloud_cover}%, stability=${stabilityClass}`);
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
        snapshots: snapshots.map(s => ({
          site_id: s.site_id,
          stability_class: s.stability_class,
          wind_speed_mps: s.wind_speed_mps,
        })),
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
