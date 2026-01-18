export interface GeoBounds {
  north: number; // max latitude
  south: number; // min latitude
  east: number;  // max longitude
  west: number;  // min longitude
}

export interface SiteMap {
  id: string;
  site_id: string;
  name: string;
  description: string | null;
  image_url: string;
  latitude: number | null;
  longitude: number | null;
  /** Geographic bounds of the map image for coordinate transformation */
  geo_bounds?: GeoBounds | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface FacilitySitemap {
  id: string;
  facility_id: string;
  storage_path: string;
  file_mime: string | null;
  file_name: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface OdourIncident {
  id: string;
  facility_id: string;
  occurred_at: string;
  lat: number;
  lng: number;
  intensity: number | null;
  description: string | null;
  wind_speed: number | null;
  wind_dir: number | null;
  temperature: number | null;
  humidity: number | null;
  created_by: string | null;
  created_at: string;
}

export type OdourType = 
  | 'septic'
  | 'sulfide'
  | 'ammonia'
  | 'chemical'
  | 'organic_biological'
  | 'grease_fat'
  | 'earthy_musty'
  | 'chlorine'
  | 'solvent'
  | 'fuel_oil'
  | 'unknown';

export type OdourIncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export const ODOUR_TYPES: { value: OdourType; label: string }[] = [
  { value: 'septic', label: 'Septic' },
  { value: 'sulfide', label: 'Sulfide (H₂S)' },
  { value: 'ammonia', label: 'Ammonia' },
  { value: 'chemical', label: 'Chemical' },
  { value: 'organic_biological', label: 'Organic/Biological' },
  { value: 'grease_fat', label: 'Grease/Fat' },
  { value: 'earthy_musty', label: 'Earthy/Musty' },
  { value: 'chlorine', label: 'Chlorine' },
  { value: 'solvent', label: 'Solvent' },
  { value: 'fuel_oil', label: 'Fuel/Oil' },
  { value: 'unknown', label: 'Unknown/Other' },
];

export const FIDOL_SCALE = {
  frequency: [
    { value: 1, label: 'Rare', description: 'Once or twice' },
    { value: 2, label: 'Occasional', description: 'A few times' },
    { value: 3, label: 'Frequent', description: 'Several times' },
    { value: 4, label: 'Very Frequent', description: 'Many times' },
    { value: 5, label: 'Continuous', description: 'All the time' },
  ],
  intensity: [
    { value: 1, label: 'Very Weak', description: 'Barely detectable' },
    { value: 2, label: 'Weak', description: 'Faint but recognizable' },
    { value: 3, label: 'Moderate', description: 'Clearly noticeable' },
    { value: 4, label: 'Strong', description: 'Powerful odour' },
    { value: 5, label: 'Very Strong', description: 'Overwhelming' },
  ],
  offensiveness: [
    { value: 1, label: 'Not Offensive', description: 'Neutral or pleasant' },
    { value: 2, label: 'Slightly Offensive', description: 'Mildly unpleasant' },
    { value: 3, label: 'Moderately Offensive', description: 'Unpleasant' },
    { value: 4, label: 'Offensive', description: 'Very unpleasant' },
    { value: 5, label: 'Extremely Offensive', description: 'Intolerable' },
  ],
};

export const INCIDENT_STATUSES: { value: OdourIncidentStatus; label: string; color: string }[] = [
  { value: 'open', label: 'Open', color: 'bg-red-500' },
  { value: 'investigating', label: 'Investigating', color: 'bg-yellow-500' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-500' },
  { value: 'closed', label: 'Closed', color: 'bg-muted' },
];

export interface WeatherData {
  wind_speed: number;
  wind_direction: number;
  wind_direction_text: string;
  temperature: number;
  humidity: number;
  pressure: number;
  weather_description: string;
  fetched_at: string;
}
