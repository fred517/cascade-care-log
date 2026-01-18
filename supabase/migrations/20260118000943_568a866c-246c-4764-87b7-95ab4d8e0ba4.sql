-- Add geo_bounds columns to site_maps table for proper coordinate transformation
ALTER TABLE public.site_maps
ADD COLUMN geo_bounds_north numeric,
ADD COLUMN geo_bounds_south numeric,
ADD COLUMN geo_bounds_east numeric,
ADD COLUMN geo_bounds_west numeric;

-- Add comment explaining the columns
COMMENT ON COLUMN public.site_maps.geo_bounds_north IS 'Maximum latitude (top edge) of the map image';
COMMENT ON COLUMN public.site_maps.geo_bounds_south IS 'Minimum latitude (bottom edge) of the map image';
COMMENT ON COLUMN public.site_maps.geo_bounds_east IS 'Maximum longitude (right edge) of the map image';
COMMENT ON COLUMN public.site_maps.geo_bounds_west IS 'Minimum longitude (left edge) of the map image';