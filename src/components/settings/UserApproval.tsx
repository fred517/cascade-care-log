import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Check, X, Clock, UserCheck, Users, Loader2, Mail, RotateCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PendingUser {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  surname: string | null;
  facility_name: string | null;
  phone_number: string | null;
  created_at: string;
  is_approved: boolean;
}

export default function UserApproval() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pendingUsers = [], isLoading } = useQuery({
    queryKey: ['pending-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, display_name, first_name, surname, facility_name, phone_number, created_at, is_approved')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PendingUser[];
    },
  });

  const { data: approvedUsers = [] } = useQuery({
    queryKey: ['approved-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, display_name, first_name, surname, facility_name, phone_number, created_at, is_approved')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as PendingUser[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (pendingUser: PendingUser) => {
      // First, update the profile to approved
      const { error } = await supabase
        .from('profiles')
        .update({
          is_approved: true,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('user_id', pendingUser.user_id);

      if (error) throw error;

      // Then send welcome email with password setup link
      const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
        body: {
          userId: pendingUser.user_id,
          email: pendingUser.email,
          firstName: pendingUser.first_name || pendingUser.display_name?.split(' ')[0] || '',
        },
      });

      if (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't throw - user is already approved, just log the error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['approved-users'] });
      toast({ title: 'User Approved', description: 'Welcome email with password setup link has been sent.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Delete the user from auth (requires admin API via edge function)
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      toast({ title: 'User Rejected', description: 'The user account has been removed.' });
    },
    onError: (error: any) => {
      // If edge function doesn't exist, just show a message
      toast({ 
        title: 'Note', 
        description: 'User will remain in pending state. Contact support to fully remove the account.',
        variant: 'default'
      });
    },
  });

  const [resendingUserId, setResendingUserId] = useState<string | null>(null);

  const resendWelcomeEmail = async (approvedUser: PendingUser) => {
    setResendingUserId(approvedUser.user_id);
    try {
      const { error } = await supabase.functions.invoke('send-welcome-email', {
        body: {
          userId: approvedUser.user_id,
          email: approvedUser.email,
          firstName: approvedUser.first_name || approvedUser.display_name?.split(' ')[0] || '',
        },
      });

      if (error) throw error;
      
      toast({ 
        title: 'Welcome Email Sent', 
        description: `Password setup link sent to ${approvedUser.email}` 
      });
    } catch (error: any) {
      console.error('Failed to resend welcome email:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to send welcome email. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setResendingUserId(null);
    }
  };

    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Pending Approvals</CardTitle>
              <p className="text-sm text-muted-foreground">
                {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} awaiting approval
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((pendingUser) => (
                <div
                  key={pendingUser.id}
                  className="p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {pendingUser.first_name && pendingUser.surname 
                          ? `${pendingUser.first_name} ${pendingUser.surname}`
                          : pendingUser.display_name || 'No name provided'}
                      </p>
                      <p className="text-sm text-muted-foreground">{pendingUser.email}</p>
                      {pendingUser.facility_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">Facility:</span> {pendingUser.facility_name}
                        </p>
                      )}
                      {pendingUser.phone_number && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Phone:</span> {pendingUser.phone_number}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Registered {format(new Date(pendingUser.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(pendingUser)}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject User?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {pendingUser.email} from the system. They will need to register again if they want access.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => rejectMutation.mutate(pendingUser.user_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Reject User
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Approved */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Active Users</CardTitle>
              <p className="text-sm text-muted-foreground">
                Recently approved accounts
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {approvedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No approved users yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {approvedUsers.map((approvedUser) => (
                <div
                  key={approvedUser.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">
                      {approvedUser.first_name && approvedUser.surname 
                        ? `${approvedUser.first_name} ${approvedUser.surname}`
                        : approvedUser.display_name || 'No name'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{approvedUser.email}</p>
                    {approvedUser.facility_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {approvedUser.facility_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resendWelcomeEmail(approvedUser)}
                      disabled={resendingUserId === approvedUser.user_id}
                      className="text-xs"
                    >
                      {resendingUserId === approvedUser.user_id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Mail className="w-3 h-3 mr-1" />
                          Resend
                        </>
                      )}
                    </Button>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                      <Check className="w-3 h-3 mr-1" />
                      Approved
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}