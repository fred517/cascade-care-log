import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Mail, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailRecipient {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  alert_types: string[];
}

export function EmailRecipients() {
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchRecipients();
  }, []);

  const fetchRecipients = async () => {
    try {
      const { data, error } = await supabase
        .from('email_recipients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipients(data || []);
    } catch (error: any) {
      console.error('Error fetching recipients:', error);
      toast.error('Failed to load recipients');
    } finally {
      setLoading(false);
    }
  };

  const addRecipient = async () => {
    if (!newEmail || !newName) {
      toast.error('Please enter both name and email');
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('email_recipients')
        .insert({
          email: newEmail.trim(),
          name: newName.trim(),
          is_active: true,
          alert_types: ['all'],
        })
        .select()
        .single();

      if (error) throw error;
      
      setRecipients([data, ...recipients]);
      setNewEmail('');
      setNewName('');
      toast.success('Recipient added successfully');
    } catch (error: any) {
      console.error('Error adding recipient:', error);
      toast.error('Failed to add recipient');
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('email_recipients')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      setRecipients(recipients.map(r => 
        r.id === id ? { ...r, is_active: !isActive } : r
      ));
      toast.success(`Recipient ${!isActive ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error('Error toggling recipient:', error);
      toast.error('Failed to update recipient');
    }
  };

  const deleteRecipient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_recipients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecipients(recipients.filter(r => r.id !== id));
      toast.success('Recipient removed');
    } catch (error: any) {
      console.error('Error deleting recipient:', error);
      toast.error('Failed to remove recipient');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add new recipient */}
      <div className="p-4 rounded-xl border border-border bg-muted/30">
        <h3 className="text-sm font-medium text-foreground mb-3">Add Recipient</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <button
            onClick={addRecipient}
            disabled={adding}
            className="btn-primary flex items-center justify-center gap-2 min-w-[120px]"
          >
            <Plus className="w-4 h-4" />
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Recipients list */}
      <div className="space-y-3">
        {recipients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recipients configured</p>
            <p className="text-sm">Add recipients to receive email alerts</p>
          </div>
        ) : (
          recipients.map((recipient) => (
            <div
              key={recipient.id}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-all",
                recipient.is_active
                  ? "border-border bg-card"
                  : "border-border/50 bg-muted/30 opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm",
                  recipient.is_active
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {recipient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-foreground">{recipient.name}</p>
                  <p className="text-sm text-muted-foreground">{recipient.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recipient.is_active}
                    onChange={() => toggleActive(recipient.id, recipient.is_active)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
                <button
                  onClick={() => deleteRecipient(recipient.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-status-critical hover:bg-status-critical/10 transition-colors"
                  aria-label="Delete recipient"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {recipients.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Active recipients will receive email notifications when thresholds are exceeded.
        </p>
      )}
    </div>
  );
}
