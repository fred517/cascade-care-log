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

// Stability class affects plume spreading
const STABILITY_SPREAD: Record<string, number> = {
  A: 0.35,  // Very unstable - wide spread
  B: 0.30,  // Unstable
  C: 0.27,  // Slightly unstable
  D: 0.25,  // Neutral
  E: 0.20,  // Slightly stable - narrow spread
  F: 0.15,  // Stable - very narrow
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

// Intensity profile: exponential decay with distance
function intensityAtDistance(baseIntensity: number, distance: number, maxDistance: number): number {
  return baseIntensity * Math.exp(-distance / (maxDistance * 0.6));
}

// Intensity thresholds for contours (as fraction of peak)
const CONTOUR_LEVELS = [
  { threshold: 0.8, label: "high" },
  { threshold: 0.5, label: "medium" },
  { threshold: 0.2, label: "low" },
];

interface ContourPolygon {
  level: string;
  threshold: number;
  intensity: number;
  coordinates: PlumePoint[];
}

interface PlumeResult {
  geometry: PlumePoint[];
  contours: ContourPolygon[];
  intensityProfile: { distance: number; intensity: number }[];
}

function generatePlume(
  sourceX: number,
  sourceY: number,
  windDirDeg: number,
  windSpeed: number,
  durationMin: number,
  baseIntensity: number,
  stabilityClass: string
): PlumeResult {
  // Calculate plume distance in map units (% of map)
  // windSpeed is m/s, durationMin in minutes
  // Scale factor converts meters to map percentage (assuming ~500m map width)
  const metersToMapPercent = 0.02; // 1 meter = 0.02% of map
  const distanceMeters = windSpeed * durationMin * 60;
  const distance = Math.min(distanceMeters * metersToMapPercent, 60); // Cap at 60% of map
  
  // Plume width based on stability and distance
  const spreadFactor = STABILITY_SPREAD[stabilityClass] || 0.25;
  const plumeWidth = distance * spreadFactor;
  
  // Wind direction: meteorological convention (direction wind comes FROM)
  // Convert to direction wind blows TO
  const windRadians = ((windDirDeg + 180) % 360) * (Math.PI / 180);
  
  // Direction vectors
  const dx = Math.sin(windRadians);
  const dy = -Math.cos(windRadians);
  
  // Perpendicular vectors for width
  const px = Math.cos(windRadians);
  const py = Math.sin(windRadians);
  
  // Helper to generate cone at a specific distance fraction
  const generateConeAtFraction = (fraction: number): PlumePoint[] => {
    const conePoints: PlumePoint[] = [];
    const coneDistance = distance * fraction;
    const coneWidth = plumeWidth * fraction;
    const segments = 12;
    
    // Starting point (source)
    conePoints.push({ x: sourceX, y: sourceY });
    
    // Right edge
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const dist = coneDistance * t;
      const width = coneWidth * t * 0.5;
      
      const centerX = sourceX + dx * dist;
      const centerY = sourceY + dy * dist;
      
      conePoints.push({
        x: centerX + px * width,
        y: centerY + py * width,
      });
    }
    
    // Tip
    conePoints.push({
      x: sourceX + dx * coneDistance,
      y: sourceY + dy * coneDistance,
    });
    
    // Left edge
    for (let i = segments; i >= 1; i--) {
      const t = i / segments;
      const dist = coneDistance * t;
      const width = coneWidth * t * 0.5;
      
      const centerX = sourceX + dx * dist;
      const centerY = sourceY + dy * dist;
      
      conePoints.push({
        x: centerX - px * width,
        y: centerY - py * width,
      });
    }
    
    return conePoints.map(p => ({
      x: Math.max(0, Math.min(100, p.x)),
      y: Math.max(0, Math.min(100, p.y)),
    }));
  };
  
  // Generate outer plume polygon (full extent)
  const outerPolygon = generateConeAtFraction(1.0);
  
  // Generate intensity contours
  // For exponential decay I(d) = I0 * exp(-d / (D * 0.6))
  // Solve for d where I(d) = threshold * I0: d = -ln(threshold) * D * 0.6
  const contours: ContourPolygon[] = [];
  
  for (const level of CONTOUR_LEVELS) {
    // Distance fraction where intensity equals threshold
    const distanceFraction = Math.min(1.0, -Math.log(level.threshold) * 0.6);
    const contourIntensity = baseIntensity * level.threshold;
    
    if (distanceFraction > 0.05) { // Only add if visible
      contours.push({
        level: level.label,
        threshold: level.threshold,
        intensity: Math.round(contourIntensity * 10) / 10,
        coordinates: generateConeAtFraction(distanceFraction),
      });
    }
  }
  
  // Calculate intensity profile along plume
  const intensityProfile = [];
  for (let i = 0; i <= 10; i++) {
    const d = (i / 10) * distance;
    intensityProfile.push({
      distance: d,
      intensity: intensityAtDistance(baseIntensity, d, distance),
    });
  }
  
  return {
    geometry: outerPolygon,
    contours,
    intensityProfile,
  };
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
      
      // Default duration: 60 minutes for prediction window
      const durationMin = 60;
      
      // Generate plume using new model
      const plumeResult = generatePlume(
        center.x,
        center.y,
        weather.wind_direction_deg,
        weather.wind_speed_mps,
        durationMin,
        intensity,
        weather.stability_class
      );

      // Peak intensity based on base and wind
      const peakIntensity = intensity * (1 + weather.wind_speed_mps * 0.05);

      const prediction = {
        site_id,
        source_id: source.id,
        valid_from: validFrom.toISOString(),
        valid_to: validTo.toISOString(),
        geometry: {
          type: "polygon",
          coordinates: plumeResult.geometry,
          contours: plumeResult.contours,
        },
        peak_intensity: Math.round(peakIntensity * 10) / 10,
        model_version: "plume-v2.1",
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
