import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Clock, UserPlus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PendingApprovalsWidget() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchPendingCount = async () => {
      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false);

        if (error) throw error;
        setPendingCount(count || 0);
      } catch (error) {
        console.error('Error fetching pending approvals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingCount();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('pending-approvals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'is_approved=eq.false',
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  // Don't render for non-admin users
  if (!isAdmin || loading) {
    return null;
  }

  return (
    <button
      onClick={() => navigate('/organizations')}
      className={cn(
        "w-full p-4 rounded-xl border transition-all text-left group",
        pendingCount > 0
          ? "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-500/50"
          : "bg-card border-border hover:bg-muted/50"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-lg",
            pendingCount > 0 ? "bg-yellow-500/20" : "bg-muted"
          )}>
            {pendingCount > 0 ? (
              <Clock className="w-5 h-5 text-yellow-600" />
            ) : (
              <UserPlus className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {pendingCount > 0 ? 'Pending Approvals' : 'User Management'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {pendingCount > 0
                ? `${pendingCount} user${pendingCount !== 1 ? 's' : ''} awaiting approval`
                : 'All users approved'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="bg-yellow-500 text-yellow-950 text-sm font-bold px-2.5 py-1 rounded-full">
              {pendingCount}
            </span>
          )}
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </button>
  );
}
