import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSite } from '@/hooks/useSite';
import { cn } from '@/lib/utils';
import { 
  Shield, 
  ShieldAlert, 
  User, 
  Eye,
  Loader2, 
  Check, 
  ChevronDown, 
  UserPlus, 
  Trash2,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

type SiteRole = 'owner' | 'admin' | 'operator' | 'viewer';

interface SiteMember {
  id: string;
  site_id: string;
  user_id: string;
  role: SiteRole;
  created_at: string;
  profile?: {
    display_name: string | null;
    email: string | null;
  };
}

const SITE_ROLE_OPTIONS: { value: SiteRole; label: string; description: string }[] = [
  { value: 'owner', label: 'Owner', description: 'Full control, can delete site' },
  { value: 'admin', label: 'Admin', description: 'Manage members and settings' },
  { value: 'operator', label: 'Operator', description: 'Add and edit readings' },
  { value: 'viewer', label: 'Viewer', description: 'View-only access' },
];

export function SiteMemberManagement() {
  const { user } = useAuth();
  const { site } = useSite();
  const [members, setMembers] = useState<SiteMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // Add member state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<SiteRole>('operator');
  const [addingMember, setAddingMember] = useState(false);

  // Current user's role in this site
  const [currentUserRole, setCurrentUserRole] = useState<SiteRole | null>(null);

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const fetchMembers = useCallback(async () => {
    if (!site?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_members')
        .select(`
          id,
          site_id,
          user_id,
          role,
          created_at
        `)
        .eq('site_id', site.id)
        .order('created_at');

      if (error) throw error;

      // Fetch profiles for each member
      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, email')
            .eq('user_id', member.user_id)
            .single();
          
          return {
            ...member,
            role: member.role as SiteRole,
            profile: profileData || undefined,
          };
        })
      );

      setMembers(membersWithProfiles);

      // Find current user's role
      const currentMember = membersWithProfiles.find(m => m.user_id === user?.id);
      setCurrentUserRole(currentMember?.role || null);
    } catch (error: any) {
      console.error('Error fetching site members:', error);
      toast.error('Failed to load site members');
    } finally {
      setLoading(false);
    }
  }, [site?.id, user?.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!site?.id || !addEmail.trim()) return;

    setAddingMember(true);
    try {
      // Find user by email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', addEmail.trim().toLowerCase())
        .single();

      if (profileError || !profileData) {
        throw new Error('User not found. They must have an account first.');
      }

      // Check if already a member
      const existingMember = members.find(m => m.user_id === profileData.user_id);
      if (existingMember) {
        throw new Error('User is already a member of this site');
      }

      // Add to site_members
      const { error: insertError } = await supabase
        .from('site_members')
        .insert({
          site_id: site.id,
          user_id: profileData.user_id,
          role: addRole,
        });

      if (insertError) throw insertError;

      toast.success(`Added member to site`);
      setAddEmail('');
      setAddRole('operator');
      setShowAddForm(false);
      fetchMembers();
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error(error.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRoleChange = async (memberId: string, userId: string, newRole: SiteRole) => {
    if (!canManageMembers) {
      toast.error('You do not have permission to change roles');
      return;
    }

    setUpdatingUserId(userId);
    setOpenDropdown(null);

    try {
      const { error } = await supabase
        .from('site_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Member role updated');
      fetchMembers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!canManageMembers) {
      toast.error('You do not have permission to remove members');
      return;
    }

    if (userId === user?.id) {
      toast.error('You cannot remove yourself');
      return;
    }

    setRemovingUserId(userId);

    try {
      const { error } = await supabase
        .from('site_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Member removed from site');
      fetchMembers();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error(error.message || 'Failed to remove member');
    } finally {
      setRemovingUserId(null);
    }
  };

  const getRoleBadgeStyle = (role: SiteRole) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-500/20 text-amber-600 dark:text-amber-400';
      case 'admin':
        return 'bg-primary/20 text-primary';
      case 'operator':
        return 'bg-status-info/20 text-status-info';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleIcon = (role: SiteRole) => {
    switch (role) {
      case 'owner':
        return <Shield className="w-4 h-4" />;
      case 'admin':
        return <ShieldAlert className="w-4 h-4" />;
      case 'operator':
        return <User className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-xl">
        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">No Site Selected</h3>
        <p className="text-muted-foreground">
          Please select a site to manage members.
        </p>
      </div>
    );
  }

  if (!canManageMembers && currentUserRole) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-1">
            Site Members
          </h2>
          <p className="text-sm text-muted-foreground">
            Members of {site.name}
          </p>
        </div>

        <div className="text-center py-8 mb-6 border-2 border-dashed rounded-xl">
          <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">View Only</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Only site owners and admins can manage members.
          </p>
        </div>

        {/* Read-only member list */}
        <div className="space-y-2">
          {members.map((member) => (
            <div 
              key={member.id} 
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                member.user_id === user?.id 
                  ? "border-primary/30 bg-primary/5" 
                  : "border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm",
                  getRoleBadgeStyle(member.role)
                )}>
                  {(member.profile?.display_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground text-sm">
                      {member.profile?.display_name || 'Unknown'}
                    </p>
                    {member.user_id === user?.id && (
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
                </div>
              </div>
              <span className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium capitalize",
                getRoleBadgeStyle(member.role)
              )}>
                {getRoleIcon(member.role)}
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">
            Site Members
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage who has access to {site.name}
          </p>
        </div>
        {canManageMembers && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
              showAddForm
                ? "bg-muted text-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      {/* Add Member Form */}
      {showAddForm && (
        <form onSubmit={handleAddMember} className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
          <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Add Site Member
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-foreground mb-1">
                Email *
              </label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="user@example.com"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Role
              </label>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as SiteRole)}
                className="input-field"
              >
                {SITE_ROLE_OPTIONS.filter(r => r.value !== 'owner').map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={addingMember || !addEmail}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {addingMember ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Add Member
                  </>
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            User must have an existing account. Enter their email to add them to this site.
          </p>
        </form>
      )}

      {/* Role Legend */}
      <div className="mb-6 p-4 bg-muted/30 rounded-xl border border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">Site Role Permissions</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SITE_ROLE_OPTIONS.map((role) => (
            <div key={role.value} className="flex items-start gap-2">
              <span className={cn(
                "p-1.5 rounded-lg mt-0.5",
                getRoleBadgeStyle(role.value)
              )}>
                {getRoleIcon(role.value)}
              </span>
              <div>
                <p className="font-medium text-sm text-foreground">{role.label}</p>
                <p className="text-xs text-muted-foreground">{role.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Member List */}
      <div className="space-y-3">
        {members.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No members found for this site
          </p>
        ) : (
          members.map((member) => {
            const isCurrentUser = member.user_id === user?.id;
            const isUpdating = updatingUserId === member.user_id;
            const isRemoving = removingUserId === member.user_id;
            const isDropdownOpen = openDropdown === member.user_id;
            const isOwner = member.role === 'owner';

            return (
              <div 
                key={member.id} 
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all",
                  isCurrentUser 
                    ? "border-primary/30 bg-primary/5" 
                    : "border-border"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold",
                    getRoleBadgeStyle(member.role)
                  )}>
                    {(member.profile?.display_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {member.profile?.display_name || 'Unknown'}
                      </p>
                      {isCurrentUser && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Role Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(isDropdownOpen ? null : member.user_id)}
                      disabled={isUpdating || isCurrentUser || (isOwner && currentUserRole !== 'owner')}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all min-w-[130px] justify-between",
                        (isCurrentUser || (isOwner && currentUserRole !== 'owner'))
                          ? "opacity-50 cursor-not-allowed bg-muted/50 border-border"
                          : "hover:bg-muted/50 border-border cursor-pointer"
                      )}
                    >
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span className="flex items-center gap-2 text-sm font-medium capitalize">
                            {getRoleIcon(member.role)}
                            {member.role}
                          </span>
                          {!isCurrentUser && !(isOwner && currentUserRole !== 'owner') && (
                            <ChevronDown className={cn(
                              "w-4 h-4 transition-transform",
                              isDropdownOpen && "rotate-180"
                            )} />
                          )}
                        </>
                      )}
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && !isCurrentUser && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setOpenDropdown(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-card rounded-lg border border-border shadow-lg py-1">
                          {SITE_ROLE_OPTIONS
                            .filter(r => currentUserRole === 'owner' || r.value !== 'owner')
                            .map((role) => (
                            <button
                              key={role.value}
                              onClick={() => handleRoleChange(member.id, member.user_id, role.value)}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors",
                                member.role === role.value && "bg-muted/30"
                              )}
                            >
                              {getRoleIcon(role.value)}
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
                  {canManageMembers && !isCurrentUser && !isOwner && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.user_id)}
                      disabled={isRemoving}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove member"
                    >
                      {isRemoving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {members.length > 0 && (
        <p className="text-xs text-muted-foreground mt-4">
          💡 Tip: You cannot change your own role or remove yourself. Only owners can assign the owner role.
        </p>
      )}
    </div>
  );
}
