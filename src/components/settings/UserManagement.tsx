import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Shield, ShieldAlert, User, Loader2, Check, ChevronDown, UserPlus, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

type AppRole = 'operator' | 'supervisor' | 'admin';

interface TeamMember {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: AppRole;
}

interface UserManagementProps {
  teamMembers: TeamMember[];
  onRoleUpdated: () => void;
}

const ROLE_OPTIONS: { value: AppRole; label: string; description: string }[] = [
  { value: 'operator', label: 'Operator', description: 'Can view data and add readings' },
  { value: 'supervisor', label: 'Supervisor', description: 'Can manage alerts and settings' },
  { value: 'admin', label: 'Admin', description: 'Full access including user management' },
];

const inviteSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email" }).max(255),
  name: z.string().trim().max(100).optional(),
  role: z.enum(['operator', 'supervisor', 'admin']),
});

export function UserManagement({ teamMembers, onRoleUpdated }: UserManagementProps) {
  const { isAdmin, user, profile } = useAuth();
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // Invite state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('operator');
  const [sendingInvite, setSendingInvite] = useState(false);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = inviteSchema.safeParse({
      email: inviteEmail,
      name: inviteName || undefined,
      role: inviteRole,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || 'Invalid input');
      return;
    }

    setSendingInvite(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-user-invite', {
        body: {
          email: inviteEmail.trim(),
          name: inviteName.trim() || null,
          role: inviteRole,
          invitedBy: profile?.display_name || 'An administrator',
          siteUrl: window.location.origin,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('operator');
      setShowInviteForm(false);
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (!isAdmin) {
      toast.error('Only admins can change user roles');
      return;
    }

    setUpdatingUserId(userId);
    setOpenDropdown(null);

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('User role updated successfully');
      onRoleUpdated();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update user role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleBadgeStyle = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/20 text-primary';
      case 'supervisor':
        return 'bg-status-info/20 text-status-info';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'supervisor':
        return <ShieldAlert className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-xl">
        <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">Admin Access Required</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Only administrators can manage user roles. Contact your admin to request changes.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">
            User Role Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Assign roles to control what each user can access and modify.
          </p>
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
            showInviteForm
              ? "bg-muted text-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <form onSubmit={handleSendInvite} className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
          <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Send Invitation
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-foreground mb-1">
                Email *
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Name (optional)
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="John Smith"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as AppRole)}
                className="input-field"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={sendingInvite || !inviteEmail}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sendingInvite ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Invite
                  </>
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            The user will receive an email with a link to create their account.
          </p>
        </form>
      )}

      {/* Role Legend */}
      <div className="mb-6 p-4 bg-muted/30 rounded-xl border border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">Role Permissions</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {ROLE_OPTIONS.map((role) => (
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

      {/* User List */}
      <div className="space-y-3">
        {teamMembers.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No team members found
          </p>
        ) : (
          teamMembers.map((member) => {
            const isCurrentUser = member.user_id === user?.id;
            const isUpdating = updatingUserId === member.user_id;
            const isDropdownOpen = openDropdown === member.user_id;

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
                    {(member.display_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {member.display_name || 'Unknown'}
                      </p>
                      {isCurrentUser && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                {/* Role Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(isDropdownOpen ? null : member.user_id)}
                    disabled={isUpdating || isCurrentUser}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all min-w-[140px] justify-between",
                      isCurrentUser
                        ? "opacity-50 cursor-not-allowed bg-muted/50 border-border"
                        : "hover:bg-muted/50 border-border cursor-pointer"
                    )}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span className={cn(
                          "flex items-center gap-2 text-sm font-medium capitalize",
                        )}>
                          {getRoleIcon(member.role)}
                          {member.role}
                        </span>
                        {!isCurrentUser && (
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
                      <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-card rounded-lg border border-border shadow-lg py-1">
                        {ROLE_OPTIONS.map((role) => (
                          <button
                            key={role.value}
                            onClick={() => handleRoleChange(member.user_id, role.value)}
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
              </div>
            );
          })
        )}
      </div>

      {teamMembers.length > 0 && (
        <p className="text-xs text-muted-foreground mt-4">
          💡 Tip: You cannot change your own role. Ask another admin to modify your permissions if needed.
        </p>
      )}
    </div>
  );
}
