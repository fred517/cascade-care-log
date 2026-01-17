import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OdourSource {
  id: string;
  site_id: string;
  name: string | null;
  geometry: { type: string; x?: number; y?: number; coordinates?: Array<{ x: number; y: number }> };
  base_intensity: number | null;
}

interface WeatherSnapshot {
  wind_speed_mps: number;
  wind_direction_deg: number;
  stability_class: string;
  temperature_c: number | null;
}

interface PlumePoint {
  x: number;
  y: number;
}

// Pasquill-Gifford stability class dispersion parameters
const STABILITY_PARAMS: Record<string, { sigmaY: number; sigmaZ: number; spreadFactor: number }> = {
  A: { sigmaY: 0.22, sigmaZ: 0.20, spreadFactor: 1.8 },  // Very unstable
  B: { sigmaY: 0.16, sigmaZ: 0.12, spreadFactor: 1.5 },  // Unstable
  C: { sigmaY: 0.11, sigmaZ: 0.08, spreadFactor: 1.2 },  // Slightly unstable
  D: { sigmaY: 0.08, sigmaZ: 0.06, spreadFactor: 1.0 },  // Neutral
  E: { sigmaY: 0.06, sigmaZ: 0.03, spreadFactor: 0.8 },  // Slightly stable
  F: { sigmaY: 0.04, sigmaZ: 0.02, spreadFactor: 0.6 },  // Stable
};

function getSourceCenter(geometry: OdourSource["geometry"]): { x: number; y: number } | null {
  if (geometry.type === "point" && geometry.x !== undefined && geometry.y !== undefined) {
    return { x: geometry.x, y: geometry.y };
  }
  if (geometry.type === "polygon" && geometry.coordinates?.length) {
    const x = geometry.coordinates.reduce((s, c) => s + c.x, 0) / geometry.coordinates.length;
    const y = geometry.coordinates.reduce((s, c) => s + c.y, 0) / geometry.coordinates.length;
    return { x, y };
  }
  return null;
}

function generateGaussianPlumePolygon(
  sourceX: number,
  sourceY: number,
  windDirection: number,
  windSpeed: number,
  stabilityClass: string,
  intensity: number
): PlumePoint[] {
  const params = STABILITY_PARAMS[stabilityClass] || STABILITY_PARAMS.D;
  
  // Wind direction in radians (meteorological: direction wind comes FROM)
  // We need the direction wind blows TO
  const windRadians = ((windDirection + 180) % 360) * (Math.PI / 180);
  
  // Calculate plume length based on wind speed and intensity
  const baseLength = 15 + windSpeed * 4;
  const plumeLength = baseLength * (intensity / 3) * params.spreadFactor;
  
  // Maximum width at the end of plume (lateral spread)
  const maxWidth = plumeLength * params.sigmaY * 2;
  
  // Generate plume polygon points
  const points: PlumePoint[] = [];
  const segments = 12;
  
  // Direction vectors
  const dx = Math.sin(windRadians);
  const dy = -Math.cos(windRadians);
  
  // Perpendicular vectors for width
  const px = Math.cos(windRadians);
  const py = Math.sin(windRadians);
  
  // Starting point (source)
  points.push({ x: sourceX, y: sourceY });
  
  // Right edge of plume (expanding outward)
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const dist = plumeLength * t;
    const width = maxWidth * t * 0.5; // Width increases along plume
    
    const centerX = sourceX + dx * dist;
    const centerY = sourceY + dy * dist;
    
    points.push({
      x: centerX + px * width,
      y: centerY + py * width,
    });
  }
  
  // End cap
  const endX = sourceX + dx * plumeLength;
  const endY = sourceY + dy * plumeLength;
  points.push({ x: endX, y: endY });
  
  // Left edge of plume (contracting back)
  for (let i = segments; i >= 1; i--) {
    const t = i / segments;
    const dist = plumeLength * t;
    const width = maxWidth * t * 0.5;
    
    const centerX = sourceX + dx * dist;
    const centerY = sourceY + dy * dist;
    
    points.push({
      x: centerX - px * width,
      y: centerY - py * width,
    });
  }
  
  // Clamp coordinates to 0-100 range
  return points.map(p => ({
    x: Math.max(0, Math.min(100, p.x)),
    y: Math.max(0, Math.min(100, p.y)),
  }));
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { site_id, validity_hours = 1 } = await req.json();

    if (!site_id) {
      return new Response(
        JSON.stringify({ error: "site_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating plume predictions for site: ${site_id}`);

    // Fetch odour sources for the site
    const { data: sources, error: sourcesError } = await supabase
      .from("odour_sources")
      .select("*")
      .eq("site_id", site_id);

    if (sourcesError) {
      console.error("Error fetching sources:", sourcesError);
      throw sourcesError;
    }

    if (!sources?.length) {
      console.log("No odour sources found for site");
      return new Response(
        JSON.stringify({ message: "No odour sources found", predictions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${sources.length} odour sources`);

    // Fetch latest weather snapshot for the site
    const { data: weatherData, error: weatherError } = await supabase
      .from("weather_snapshots")
      .select("*")
      .eq("site_id", site_id)
      .order("recorded_at", { ascending: false })
      .limit(1);

    if (weatherError) {
      console.error("Error fetching weather:", weatherError);
      throw weatherError;
    }

    if (!weatherData?.length) {
      console.log("No weather data available for site");
      return new Response(
        JSON.stringify({ error: "No weather data available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const weather = weatherData[0] as WeatherSnapshot;
    console.log(`Weather: wind ${weather.wind_speed_mps} m/s, dir ${weather.wind_direction_deg}°, stability ${weather.stability_class}`);

    if (
      weather.wind_speed_mps === null ||
      weather.wind_direction_deg === null ||
      !weather.stability_class
    ) {
      return new Response(
        JSON.stringify({ error: "Incomplete weather data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate validity period
    const validFrom = new Date();
    const validTo = new Date(validFrom.getTime() + validity_hours * 60 * 60 * 1000);

    // Generate predictions for each source
    const predictions = [];

    for (const source of sources as OdourSource[]) {
      const center = getSourceCenter(source.geometry);
      if (!center) {
        console.log(`Skipping source ${source.id}: invalid geometry`);
        continue;
      }

      const intensity = source.base_intensity || 3;
      
      // Generate Gaussian plume polygon
      const plumePolygon = generateGaussianPlumePolygon(
        center.x,
        center.y,
        weather.wind_direction_deg,
        weather.wind_speed_mps,
        weather.stability_class,
        intensity
      );

      // Calculate peak intensity (decreases with distance from source)
      const peakIntensity = intensity * (1 + weather.wind_speed_mps * 0.1);

      const prediction = {
        site_id,
        source_id: source.id,
        valid_from: validFrom.toISOString(),
        valid_to: validTo.toISOString(),
        geometry: {
          type: "polygon",
          coordinates: plumePolygon,
        },
        peak_intensity: Math.round(peakIntensity * 10) / 10,
        model_version: "gaussian-v1.0",
      };

      predictions.push(prediction);
    }

    console.log(`Generated ${predictions.length} predictions`);

    // Delete old predictions for this site that have expired
    const { error: deleteError } = await supabase
      .from("odour_predictions")
      .delete()
      .eq("site_id", site_id)
      .lt("valid_to", new Date().toISOString());

    if (deleteError) {
      console.warn("Error deleting old predictions:", deleteError);
    }

    // Insert new predictions
    if (predictions.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from("odour_predictions")
        .insert(predictions)
        .select();

      if (insertError) {
        console.error("Error inserting predictions:", insertError);
        throw insertError;
      }

      console.log(`Inserted ${inserted?.length || 0} predictions`);

      return new Response(
        JSON.stringify({
          message: `Generated ${predictions.length} plume predictions`,
          predictions: inserted,
          weather: {
            wind_speed: weather.wind_speed_mps,
            wind_direction: weather.wind_direction_deg,
            stability_class: weather.stability_class,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "No predictions generated", predictions: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating predictions:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
