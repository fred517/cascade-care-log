import { useState, useRef } from 'react';
import { Upload, MapPin, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useCreateSiteMap } from '@/hooks/useOdourMapping';
import { toast } from 'sonner';

interface SiteMapUploadProps {
  open: boolean;
  onClose: () => void;
}

export default function SiteMapUpload({ open, onClose }: SiteMapUploadProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createSiteMap = useCreateSiteMap();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      if (!selectedFile.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toFixed(6));
          setLongitude(position.coords.longitude.toFixed(6));
          toast.success('Location captured');
        },
        (error) => {
          toast.error('Could not get location: ' + error.message);
        }
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim()) {
      toast.error('Please provide a name and upload an image');
      return;
    }

    setUploading(true);
    try {
      // Upload to storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('site-maps')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('site-maps')
        .getPublicUrl(uploadData.path);

      // Create site map record
      await createSiteMap.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        imageUrl: urlData.publicUrl,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      });

      // Reset and close
      setName('');
      setDescription('');
      setLatitude('');
      setLongitude('');
      setFile(null);
      setPreview(null);
      onClose();
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setName('');
      setDescription('');
      setLatitude('');
      setLongitude('');
      setFile(null);
      setPreview(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Site Map</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File upload area */}
          <div
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPreview(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload site map or Google Earth screenshot
                </p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Map Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Plant Aerial View"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of the area covered"
              rows={2}
            />
          </div>

          {/* GPS Coordinates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>GPS Coordinates (optional)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={handleGetLocation}>
                <MapPin className="w-4 h-4 mr-1" />
                Use Current Location
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                type="number"
                step="any"
              />
              <Input
                placeholder="Longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                type="number"
                step="any"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Coordinates enable automatic weather data fetching for odour incidents
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !file || !name.trim()}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Map'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
