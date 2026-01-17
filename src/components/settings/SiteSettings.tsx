import { useState, useEffect } from 'react';
import { Check, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Site {
  id: string;
  name: string;
  timezone: string;
  ammonia_basis: string;
  address?: string;
}

interface SiteSettingsProps {
  site: Site | null;
}

export function SiteSettings({ site }: SiteSettingsProps) {
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (site) {
      setAddress((site as any).address || '');
    }
  }, [site]);

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setHasChanges(value !== ((site as any)?.address || ''));
  };

  const handleSave = async () => {
    if (!site?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('sites')
        .update({ address })
        .eq('id', site.id);

      if (error) throw error;
      
      toast.success('Site settings saved');
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving site settings:', error);
      toast.error('Failed to save site settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Site Configuration
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage site details and preferences.
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Site Name
          </label>
          <input 
            type="text" 
            value={site?.name || 'Main Treatment Plant'}
            readOnly
            className="input-field bg-muted/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Site Address
            </span>
          </label>
          <input 
            type="text" 
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder="Enter site address for PDF reports..."
            className="input-field"
          />
          <p className="text-xs text-muted-foreground mt-1">
            This address will appear on odour incident PDF reports.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Timezone
          </label>
          <input 
            type="text" 
            value={site?.timezone || 'America/New_York'}
            readOnly
            className="input-field bg-muted/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Ammonia Reporting Basis
          </label>
          <input 
            type="text" 
            value={site?.ammonia_basis === 'nh4n' ? 'NH₄-N (Ammonium Nitrogen)' : 'NH₃-N (Ammonia Nitrogen)'}
            readOnly
            className="input-field bg-muted/50"
          />
        </div>

        {hasChanges && (
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 btn-primary disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Contact an administrator to change other site settings.
        </p>
      </div>
    </div>
  );
}
