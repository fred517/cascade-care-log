import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  Building2, 
  Plus, 
  Users, 
  Settings, 
  Loader2, 
  Crown, 
  Shield, 
  User, 
  Eye,
  MoreVertical,
  Pencil,
  Trash2,
  UserPlus,
  Check,
  X,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

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

  const fetchOrganizations = useCallback(async () => {
    if (!user) return;
    
    try {
      // Get all orgs the user is a member of
      const { data: memberships, error: memError } = await supabase
        .from('org_members')
        .select('org_id, role')
        .eq('user_id', user.id);

      if (memError) throw memError;

      if (!memberships || memberships.length === 0) {
        setOrganizations([]);
        setLoading(false);
        return;
      }

      const orgIds = memberships.map(m => m.org_id);
      
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      if (orgsError) throw orgsError;

      // Get member counts
      const orgsWithDetails = await Promise.all(
        (orgs || []).map(async (org) => {
          const { count } = await supabase
            .from('org_members')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', org.id);
          
          const membership = memberships.find(m => m.org_id === org.id);
          
          return {
            ...org,
            member_count: count || 0,
            user_role: membership?.role as OrgRole,
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

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    if (selectedOrg) {
      fetchOrgMembers(selectedOrg.id);
    }
  }, [selectedOrg, fetchOrgMembers]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = orgSchema.safeParse({ name: newOrgName });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message);
      return;
    }

    setCreating(true);
    try {
      // Create organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: newOrgName.trim() })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('org_members')
        .insert({
          org_id: newOrg.id,
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
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">Organizations</h1>
            <p className="text-sm text-muted-foreground">
              Manage organizations and team members
            </p>
          </div>
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
      </div>
    </AppLayout>
  );
}
