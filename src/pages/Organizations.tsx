import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  Building2, 
  Plus, 
  Users, 
  Loader2, 
  Crown, 
  Shield, 
  User, 
  Eye,
  Pencil,
  Trash2,
  UserPlus,
  Check,
  X,
  ChevronDown,
  Clock,
  UserCheck,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type OrgRole = 'owner' | 'admin' | 'operator' | 'viewer';

interface Organization {
  id: string;
  name: string;
  created_at: string;
  member_count?: number;
  user_role?: OrgRole;
}

interface OrgMember {
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profile?: {
    display_name: string | null;
    email: string | null;
  };
}

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

interface Site {
  id: string;
  name: string;
}

const ORG_ROLES: { value: OrgRole; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'owner', label: 'Owner', icon: <Crown className="w-4 h-4" />, description: 'Full control, can delete org' },
  { value: 'admin', label: 'Admin', icon: <Shield className="w-4 h-4" />, description: 'Manage members and settings' },
  { value: 'operator', label: 'Operator', icon: <User className="w-4 h-4" />, description: 'Add and edit readings' },
  { value: 'viewer', label: 'Viewer', icon: <Eye className="w-4 h-4" />, description: 'View only access' },
];

const orgSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
});

export default function Organizations() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Create org state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Edit org state
  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Invite member state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('operator');
  const [inviting, setInviting] = useState(false);
  
  // Role dropdown state
  const [openRoleDropdown, setOpenRoleDropdown] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // Pending user approval state
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedPendingUser, setSelectedPendingUser] = useState<PendingUser | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [assignmentMode, setAssignmentMode] = useState<'create' | 'existing'>('create');
  const [approvingUser, setApprovingUser] = useState(false);
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [approvedUsers, setApprovedUsers] = useState<PendingUser[]>([]);

  const fetchOrganizations = useCallback(async () => {
    if (!user) return;
    
    try {
      // Check if user is a global admin
      const { data: userRole } = await supabase
        .rpc('get_user_role', { _user_id: user.id });
      const isGlobalAdmin = userRole === 'admin';

      let orgs: Organization[] = [];
      let memberships: { org_id: string; role: string }[] = [];

      if (isGlobalAdmin) {
        // Global admins see all organizations
        const { data: allOrgs, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false });

        if (orgsError) throw orgsError;
        orgs = allOrgs || [];

        // Fetch memberships for the admin (to set correct role if they're a member)
        const { data: adminMemberships } = await supabase
          .from('org_members')
          .select('org_id, role')
          .eq('user_id', user.id);
        memberships = adminMemberships || [];
      } else {
        // Regular users see only orgs they're members of
        const { data: userMemberships, error: memError } = await supabase
          .from('org_members')
          .select('org_id, role')
          .eq('user_id', user.id);

        if (memError) throw memError;
        memberships = userMemberships || [];

        if (memberships.length === 0) {
          setOrganizations([]);
          setLoading(false);
          return;
        }

        const orgIds = memberships.map(m => m.org_id);
        
        const { data: memberOrgs, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .in('id', orgIds);

        if (orgsError) throw orgsError;
        orgs = memberOrgs || [];
      }

      // Get member counts
      const orgsWithDetails = await Promise.all(
        orgs.map(async (org) => {
          const { count } = await supabase
            .from('org_members')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', org.id);
          
          const membership = memberships.find(m => m.org_id === org.id);
          
          return {
            ...org,
            member_count: count || 0,
            // Global admins get 'admin' role for all orgs if not explicit member
            user_role: (membership?.role as OrgRole) || (isGlobalAdmin ? 'admin' : undefined),
          };
        })
      );

      setOrganizations(orgsWithDetails);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchOrgMembers = useCallback(async (orgId: string) => {
    setLoadingMembers(true);
    try {
      const { data: members, error } = await supabase
        .from('org_members')
        .select('*')
        .eq('org_id', orgId);

      if (error) throw error;

      // Get profiles for each member
      const membersWithProfiles: OrgMember[] = await Promise.all(
        (members || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, email')
            .eq('user_id', member.user_id)
            .maybeSingle();
          
          return { 
            ...member, 
            role: member.role as OrgRole,
            profile: profile || undefined 
          };
        })
      );

      setOrgMembers(membersWithProfiles);
    } catch (error: any) {
      console.error('Error fetching org members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  const fetchPendingUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, display_name, first_name, surname, facility_name, phone_number, created_at, is_approved')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingUsers(data as PendingUser[]);
    } catch (error: any) {
      console.error('Error fetching pending users:', error);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const fetchApprovedUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, display_name, first_name, surname, facility_name, phone_number, created_at, is_approved')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setApprovedUsers(data as PendingUser[]);
    } catch (error: any) {
      console.error('Error fetching approved users:', error);
    }
  }, []);

  const fetchSites = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSites(data as Site[]);
    } catch (error: any) {
      console.error('Error fetching sites:', error);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
    fetchPendingUsers();
    fetchApprovedUsers();
    fetchSites();
  }, [fetchOrganizations, fetchPendingUsers, fetchApprovedUsers, fetchSites]);

  useEffect(() => {
    if (selectedOrg) {
      fetchOrgMembers(selectedOrg.id);
    }
  }, [selectedOrg, fetchOrgMembers]);

  const openApprovalDialog = (pendingUser: PendingUser) => {
    setSelectedPendingUser(pendingUser);
    setSelectedSiteId('');
    setApprovalDialogOpen(true);
  };

  const handleApproveUser = async () => {
    if (!selectedPendingUser) return;

    setApprovingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Your session has expired. Please sign in again and retry.');
      }

      const facilityName = selectedPendingUser.facility_name?.trim();
      let createdSiteId: string | null = null;
      let createdOrgId: string | null = null;
      let assignedOrgId: string | null = null;

      // Check if we should create new org or assign to existing
      const shouldCreateNewOrg = facilityName && assignmentMode === 'create';
      const shouldAssignToExisting = assignmentMode === 'existing' && selectedOrgId;

      if (shouldCreateNewOrg) {
        const orgId = crypto.randomUUID();

        // Create organization with the facility name
        const { error: orgError } = await supabase
          .from('organizations')
          .insert({ id: orgId, name: facilityName });

        if (orgError) throw orgError;
        createdOrgId = orgId;

        // Add the approved user as owner of the organization
        const { error: orgMemberError } = await supabase
          .from('org_members')
          .insert({
            org_id: orgId,
            user_id: selectedPendingUser.user_id,
            role: 'owner',
          });

        if (orgMemberError) throw orgMemberError;

        // Create a site under this organization with the same name
        const { data: newSite, error: siteError } = await supabase
          .from('sites')
          .insert({
            name: facilityName,
            org_id: orgId,
          })
          .select()
          .single();

        if (siteError) throw siteError;
        createdSiteId = newSite.id;

        // Add user to the site as admin
        const { error: siteMemberError } = await supabase
          .from('site_members')
          .insert({
            user_id: selectedPendingUser.user_id,
            site_id: newSite.id,
            role: 'admin',
          });

        if (siteMemberError) throw siteMemberError;
      } else if (shouldAssignToExisting) {
        assignedOrgId = selectedOrgId;

        // Add user to the existing organization as operator
        const { error: orgMemberError } = await supabase
          .from('org_members')
          .insert({
            org_id: selectedOrgId,
            user_id: selectedPendingUser.user_id,
            role: 'operator',
          });

        if (orgMemberError) throw orgMemberError;

        // If a site is also selected, add user to that site
        if (selectedSiteId) {
          await supabase
            .from('site_members')
            .upsert({
              user_id: selectedPendingUser.user_id,
              site_id: selectedSiteId,
              role: 'operator',
            }, { onConflict: 'user_id,site_id' });
        }
      }

      // Use the created site or the manually selected site
      const finalSiteId = createdSiteId || selectedSiteId || null;

      // Update the profile to approved
      const { error } = await supabase
        .from('profiles')
        .update({
          is_approved: true,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          site_id: finalSiteId,
        })
        .eq('user_id', selectedPendingUser.user_id);

      if (error) throw error;

      // Remove from default site if exists
      await supabase
        .from('site_members')
        .delete()
        .eq('user_id', selectedPendingUser.user_id)
        .eq('site_id', '00000000-0000-0000-0000-000000000001');

      // If no org was created/assigned but a site was selected, add user to that site
      if (!createdSiteId && !shouldAssignToExisting && selectedSiteId) {
        await supabase
          .from('site_members')
          .upsert({
            user_id: selectedPendingUser.user_id,
            site_id: selectedSiteId,
            role: 'operator',
          }, { onConflict: 'user_id,site_id' });
      }

      // Assign default operator role in user_roles table
      await supabase
        .from('user_roles')
        .upsert({
          user_id: selectedPendingUser.user_id,
          role: 'operator',
        }, { onConflict: 'user_id' });

      // Send welcome email
      await supabase.functions.invoke('send-welcome-email', {
        body: {
          userId: selectedPendingUser.user_id,
          email: selectedPendingUser.email,
          firstName: selectedPendingUser.first_name || selectedPendingUser.display_name?.split(' ')[0] || '',
        },
      });

      let successMessage = 'User approved and welcome email sent';
      if (createdOrgId) {
        successMessage = `User approved! Organization "${facilityName}" created with site.`;
      } else if (assignedOrgId) {
        const orgName = organizations.find(o => o.id === assignedOrgId)?.name;
        successMessage = `User approved and added to "${orgName}" organization.`;
      }
      
      toast.success(successMessage);
      setApprovalDialogOpen(false);
      setSelectedPendingUser(null);
      setSelectedSiteId('');
      setSelectedOrgId('');
      setAssignmentMode('create');
      fetchPendingUsers();
      fetchApprovedUsers();
      fetchOrganizations();
      fetchSites();
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast.error(error.message || 'Failed to approve user');
    } finally {
      setApprovingUser(false);
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      await supabase.functions.invoke('delete-user', {
        body: { userId },
      });
      toast.success('User rejected');
      fetchPendingUsers();
    } catch (error: any) {
      toast.info('User will remain in pending state. Contact support to fully remove.');
    }
  };

  const resendWelcomeEmail = async (approvedUser: PendingUser) => {
    setResendingUserId(approvedUser.user_id);
    try {
      await supabase.functions.invoke('send-welcome-email', {
        body: {
          userId: approvedUser.user_id,
          email: approvedUser.email,
          firstName: approvedUser.first_name || approvedUser.display_name?.split(' ')[0] || '',
        },
      });
      toast.success(`Welcome email sent to ${approvedUser.email}`);
    } catch (error: any) {
      toast.error('Failed to send welcome email');
    } finally {
      setResendingUserId(null);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = orgSchema.safeParse({ name: newOrgName });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message);
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Your session has expired. Please sign in again and retry.');
      }

      // Create organization
      const orgId = crypto.randomUUID();
      const { error: orgError } = await supabase
        .from('organizations')
        .insert({ id: orgId, name: newOrgName.trim() });

      if (orgError) throw orgError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('org_members')
        .insert({
          org_id: orgId,
          user_id: user!.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      toast.success('Organization created successfully');
      setNewOrgName('');
      setShowCreateForm(false);
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateOrgName = async (orgId: string) => {
    const validation = orgSchema.safeParse({ name: editName });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: editName.trim() })
        .eq('id', orgId);

      if (error) throw error;

      toast.success('Organization updated');
      setEditingOrg(null);
      fetchOrganizations();
      if (selectedOrg?.id === orgId) {
        setSelectedOrg({ ...selectedOrg, name: editName.trim() });
      }
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast.error(error.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgId);

      if (error) throw error;

      toast.success('Organization deleted');
      if (selectedOrg?.id === orgId) {
        setSelectedOrg(null);
      }
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toast.error(error.message || 'Failed to delete organization');
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !inviteEmail) return;

    setInviting(true);
    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', inviteEmail.trim())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        toast.error('No user found with this email. They need to create an account first.');
        setInviting(false);
        return;
      }

      // Check if already a member
      const existingMember = orgMembers.find(m => m.user_id === profile.user_id);
      if (existingMember) {
        toast.error('This user is already a member of this organization');
        setInviting(false);
        return;
      }

      // Add member
      const { error } = await supabase
        .from('org_members')
        .insert({
          org_id: selectedOrg.id,
          user_id: profile.user_id,
          role: inviteRole,
        });

      if (error) throw error;

      toast.success('Member added successfully');
      setInviteEmail('');
      setInviteRole('operator');
      setShowInviteForm(false);
      fetchOrgMembers(selectedOrg.id);
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error(error.message || 'Failed to add member');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: OrgRole) => {
    if (!selectedOrg) return;

    setUpdatingRole(userId);
    setOpenRoleDropdown(null);

    try {
      const { error } = await supabase
        .from('org_members')
        .update({ role: newRole })
        .eq('org_id', selectedOrg.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Role updated');
      fetchOrgMembers(selectedOrg.id);
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedOrg) return;
    
    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('org_members')
        .delete()
        .eq('org_id', selectedOrg.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Member removed');
      fetchOrgMembers(selectedOrg.id);
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error(error.message || 'Failed to remove member');
    }
  };

  const getRoleBadgeStyle = (role: OrgRole) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-500/20 text-amber-600';
      case 'admin':
        return 'bg-primary/20 text-primary';
      case 'operator':
        return 'bg-status-info/20 text-status-info';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleIcon = (role: OrgRole) => {
    const roleOption = ORG_ROLES.find(r => r.value === role);
    return roleOption?.icon || <User className="w-4 h-4" />;
  };

  const canManageOrg = (org: Organization) => {
    return org.user_role === 'owner' || org.user_role === 'admin';
  };

  const canDeleteOrg = (org: Organization) => {
    return org.user_role === 'owner';
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">
              Manage organizations and approve new users
            </p>
          </div>
        </div>

        {/* Site Assignment Dialog for User Approval */}
        <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Approve User</DialogTitle>
              <DialogDescription>
                Review the details and approve this user's access request.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              {/* User Details */}
              <div className="space-y-2">
                <Label>User Details</Label>
                <div className="p-3 rounded-lg bg-muted text-sm">
                  <p className="font-medium">
                    {selectedPendingUser?.first_name && selectedPendingUser?.surname 
                      ? `${selectedPendingUser.first_name} ${selectedPendingUser.surname}`
                      : selectedPendingUser?.display_name || 'No name'}
                  </p>
                  <p className="text-muted-foreground">{selectedPendingUser?.email}</p>
                  {selectedPendingUser?.phone_number && (
                    <p className="text-muted-foreground">{selectedPendingUser.phone_number}</p>
                  )}
                  {selectedPendingUser?.facility_name && (
                    <p className="text-muted-foreground mt-1">
                      <span className="font-medium">Requested facility:</span> {selectedPendingUser.facility_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Assignment Mode Toggle - only show if facility name exists */}
              {selectedPendingUser?.facility_name && organizations.length > 0 && (
                <div className="space-y-2">
                  <Label>Assignment Option</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentMode('create');
                        setSelectedOrgId('');
                        setSelectedSiteId('');
                      }}
                      className={cn(
                        "p-3 rounded-lg border text-sm text-left transition-all",
                        assignmentMode === 'create'
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <Plus className="w-4 h-4" />
                        Create New
                      </div>
                      <p className="text-xs mt-1 opacity-80">New org & site</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignmentMode('existing')}
                      className={cn(
                        "p-3 rounded-lg border text-sm text-left transition-all",
                        assignmentMode === 'existing'
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <Users className="w-4 h-4" />
                        Add to Existing
                      </div>
                      <p className="text-xs mt-1 opacity-80">Join existing org</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Create New Organization - Prominent display */}
              {selectedPendingUser?.facility_name && assignmentMode === 'create' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Organization to be Created
                  </Label>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-semibold text-lg text-foreground">
                      {selectedPendingUser.facility_name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      A new organization and site will be automatically created with this name. 
                      The user will be added as the <span className="font-medium text-foreground">owner</span>.
                    </p>
                  </div>
                </div>
              )}

              {/* Assign to Existing Organization */}
              {assignmentMode === 'existing' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-select">Select Organization</Label>
                    <Select value={selectedOrgId} onValueChange={(value) => {
                      setSelectedOrgId(value);
                      setSelectedSiteId(''); // Reset site when org changes
                    }}>
                      <SelectTrigger id="org-select">
                        <SelectValue placeholder="Select an organization..." />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              {org.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedOrgId && (
                    <div className="space-y-2">
                      <Label htmlFor="site-select">Select Site (Optional)</Label>
                      <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                        <SelectTrigger id="site-select">
                          <SelectValue placeholder="Select a site..." />
                        </SelectTrigger>
                        <SelectContent>
                          {sites
                            .filter(site => {
                              // Filter sites by org_id if we have that data
                              // For now show all sites - in production you'd filter by org
                              return true;
                            })
                            .map((site) => (
                              <SelectItem key={site.id} value={site.id}>
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-muted-foreground" />
                                  {site.name}
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        The user will be added as an operator to this organization and site.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* No facility name - just site selection */}
              {!selectedPendingUser?.facility_name && (
                <div className="space-y-2">
                  <Label htmlFor="site-select">Assign to Existing Site</Label>
                  <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                    <SelectTrigger id="site-select">
                      <SelectValue placeholder="Select a site..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            {site.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    No facility name provided. Select an existing site to assign this user.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleApproveUser}
                disabled={
                  approvingUser || 
                  // For create mode with facility name - always valid
                  (assignmentMode === 'create' && !selectedPendingUser?.facility_name && !selectedSiteId) ||
                  // For existing mode - need org selected
                  (assignmentMode === 'existing' && !selectedOrgId) ||
                  // No facility name and no site selected
                  (!selectedPendingUser?.facility_name && !selectedSiteId && assignmentMode !== 'existing')
                }
                className="bg-green-600 hover:bg-green-700"
              >
                {approvingUser ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                {assignmentMode === 'existing'
                  ? 'Approve & Add to Organization'
                  : selectedPendingUser?.facility_name 
                    ? 'Approve & Create Organization'
                    : 'Approve & Send Welcome Email'
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="approvals" className="space-y-6">
          <TabsList>
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              User Approvals
              {pendingUsers.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs h-5 w-5 p-0 justify-center">
                  {pendingUsers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="organizations" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Organizations
            </TabsTrigger>
          </TabsList>

          {/* User Approvals Tab */}
          <TabsContent value="approvals" className="space-y-6">
            {/* Pending Approvals */}
            <div className="bg-card rounded-xl border border-border p-4 lg:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Pending Approvals</h2>
                  <p className="text-sm text-muted-foreground">
                    {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} awaiting approval
                  </p>
                </div>
              </div>

              {loadingPending ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : pendingUsers.length === 0 ? (
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
                            onClick={() => openApprovalDialog(pendingUser)}
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
                                  onClick={() => handleRejectUser(pendingUser.user_id)}
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
            </div>

            {/* Recently Approved */}
            <div className="bg-card rounded-xl border border-border p-4 lg:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Active Users</h2>
                  <p className="text-sm text-muted-foreground">
                    Recently approved accounts
                  </p>
                </div>
              </div>

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
            </div>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-6">
            {/* Create Org Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all shrink-0",
                  showCreateForm
                    ? "bg-muted text-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                <Plus className="w-4 h-4" />
                New Org
              </button>
            </div>

        {/* Create Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateOrg} className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Create New Organization
            </h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Organization name"
                  className="input-field"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={creating || !newOrgName.trim()}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create
              </button>
            </div>
          </form>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Organization List */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-4">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Your Organizations
              </h2>
              
              {organizations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No organizations yet</p>
                  <p className="text-sm">Create one to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      onClick={() => setSelectedOrg(org)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        selectedOrg?.id === org.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {editingOrg === org.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="input-field text-sm py-1"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateOrgName(org.id);
                                }}
                                disabled={saving}
                                className="p-1 text-primary hover:bg-primary/10 rounded"
                              >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingOrg(null);
                                }}
                                className="p-1 text-muted-foreground hover:bg-muted rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <h3 className="font-medium text-foreground truncate">{org.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {org.member_count} member{org.member_count !== 1 ? 's' : ''}
                                </span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full capitalize flex items-center gap-1",
                                  getRoleBadgeStyle(org.user_role!)
                                )}>
                                  {getRoleIcon(org.user_role!)}
                                  {org.user_role}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        {canManageOrg(org) && editingOrg !== org.id && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingOrg(org.id);
                                setEditName(org.name);
                              }}
                              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {canDeleteOrg(org) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOrg(org.id);
                                }}
                                className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Organization Details */}
          <div className="lg:col-span-2">
            {selectedOrg ? (
              <div className="bg-card rounded-xl border border-border p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-foreground truncate">{selectedOrg.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(selectedOrg.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {canManageOrg(selectedOrg) && (
                    <button
                      onClick={() => setShowInviteForm(!showInviteForm)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0",
                        showInviteForm
                          ? "bg-muted text-foreground"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Member
                    </button>
                  )}
                </div>

                {/* Invite Form */}
                {showInviteForm && canManageOrg(selectedOrg) && (
                  <form onSubmit={handleInviteMember} className="mb-4 p-3 bg-muted/30 rounded-lg border border-border">
                    <h3 className="font-medium text-foreground text-sm mb-2">Add Member by Email</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="input-field flex-1 text-sm"
                        required
                      />
                      <div className="flex gap-2">
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                          className="input-field w-28 text-sm"
                        >
                          {ORG_ROLES.filter(r => r.value !== 'owner').map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          disabled={inviting || !inviteEmail}
                          className="btn-primary flex items-center gap-1.5 text-sm px-3 disabled:opacity-50"
                        >
                          {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                          Add
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      User must have an account to be added.
                    </p>
                  </form>
                )}

                {/* Members List */}
                <div>
                  <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Members ({orgMembers.length})
                  </h3>

                  {loadingMembers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {orgMembers.map((member) => {
                        const isCurrentUser = member.user_id === user?.id;
                        const canEdit = canManageOrg(selectedOrg) && !isCurrentUser && member.role !== 'owner';
                        const isUpdating = updatingRole === member.user_id;

                        return (
                          <div
                            key={member.user_id}
                            className={cn(
                              "flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border",
                              isCurrentUser ? "border-primary/30 bg-primary/5" : "border-border"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0",
                                getRoleBadgeStyle(member.role)
                              )}>
                                {(member.profile?.display_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-medium text-foreground text-sm truncate">
                                    {member.profile?.display_name || 'Unknown'}
                                  </p>
                                  {isCurrentUser && (
                                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                                      You
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{member.profile?.email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Role Dropdown */}
                              <div className="relative">
                                <button
                                  onClick={() => canEdit && setOpenRoleDropdown(openRoleDropdown === member.user_id ? null : member.user_id)}
                                  disabled={!canEdit || isUpdating}
                                  className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all",
                                    canEdit 
                                      ? "border border-border hover:bg-muted/50 cursor-pointer" 
                                      : "bg-muted/30 cursor-default",
                                    getRoleBadgeStyle(member.role)
                                  )}
                                >
                                  {isUpdating ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      {getRoleIcon(member.role)}
                                      <span className="capitalize hidden sm:inline">{member.role}</span>
                                      {canEdit && <ChevronDown className="w-3 h-3" />}
                                    </>
                                  )}
                                </button>

                                {openRoleDropdown === member.user_id && canEdit && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-10" 
                                      onClick={() => setOpenRoleDropdown(null)}
                                    />
                                    <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-card rounded-lg border border-border shadow-lg py-1">
                                      {ORG_ROLES.filter(r => r.value !== 'owner').map((role) => (
                                        <button
                                          key={role.value}
                                          onClick={() => handleUpdateMemberRole(member.user_id, role.value)}
                                          className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors",
                                            member.role === role.value && "bg-muted/30"
                                          )}
                                        >
                                          {role.icon}
                                          <span className="flex-1">{role.label}</span>
                                          {member.role === role.value && (
                                            <Check className="w-4 h-4 text-primary" />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Remove Button */}
                              {canEdit && (
                                <button
                                  onClick={() => handleRemoveMember(member.user_id)}
                                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                  title="Remove member"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <Building2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Select an Organization</h3>
                <p className="text-muted-foreground">
                  Choose an organization from the list to view and manage its members
                </p>
              </div>
            )}
          </div>
        </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
