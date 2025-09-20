import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, UserProfile, UserRole, UserStatus } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { parseErrorMessage, parseErrorMessageWithCodes } from '@/utils/errorHelpers';

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  company_id: string;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  accepted_at?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitation_token: string;
}

export interface CreateUserData {
  email: string;
  full_name?: string;
  role: UserRole;
  phone?: string;
  department?: string;
  position?: string;
}

export interface UpdateUserData {
  full_name?: string;
  role?: UserRole;
  status?: UserStatus;
  phone?: string;
  department?: string;
  position?: string;
}

export const useUserManagement = () => {
  const { profile: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all users in the same company
  const fetchUsers = async () => {
    if (!currentUser?.company_id || !isAdmin) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setUsers(data || []);
    } catch (err) {
      const errorMessage = parseErrorMessage(err);
      console.error('Error fetching users:', err);
      setError(`Failed to fetch users: ${errorMessage}`);
      toast.error(`Error fetching users: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending invitations
  const fetchInvitations = async () => {
    if (!currentUser?.company_id || !isAdmin) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .order('invited_at', { ascending: false });

      if (error) {
        throw error;
      }

      setInvitations(data || []);
    } catch (err) {
      console.error('Error fetching invitations:', err);

      // Ensure we get a proper string error message
      let errorMessage = 'Unknown error occurred';
      try {
        errorMessage = parseErrorMessage(err);
        // Double-check that it's actually a string
        if (typeof errorMessage !== 'string') {
          errorMessage = String(errorMessage);
        }
      } catch (parseErr) {
        console.error('Error parsing error message:', parseErr);
        errorMessage = err?.message || err?.toString() || 'Failed to parse error';
      }

      setError(`Failed to fetch invitations: ${errorMessage}`);
      toast.error(`Error fetching invitations: ${errorMessage}`);
    }
  };

  // Create a new user (admin only)
  const createUser = async (userData: CreateUserData): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin || !currentUser?.company_id) {
      return { success: false, error: 'Unauthorized' };
    }

    setLoading(true);

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userData.email)
        .single();

      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: generateTemporaryPassword(),
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name,
        },
      });

      if (authError) {
        throw authError;
      }

      // Update profile with additional data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: userData.full_name,
          role: userData.role,
          phone: userData.phone,
          company_id: currentUser.company_id,
          department: userData.department,
          position: userData.position,
          status: 'active',
        })
        .eq('id', authData.user.id);

      if (profileError) {
        throw profileError;
      }

      toast.success('User created successfully');
      await fetchUsers();
      return { success: true };
    } catch (err) {
      const errorMessage = parseErrorMessageWithCodes(err, 'user creation');
      console.error('Error creating user:', err);
      toast.error(`Failed to create user: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update user (admin only)
  const updateUser = async (userId: string, userData: UpdateUserData): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update(userData)
        .eq('id', userId);

      if (error) {
        throw error;
      }

      toast.success('User updated successfully');
      await fetchUsers();
      return { success: true };
    } catch (err) {
      const errorMessage = parseErrorMessageWithCodes(err, 'user update');
      console.error('Error updating user:', err);
      toast.error(`Failed to update user: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Delete user (admin only)
  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin || userId === currentUser?.id) {
      return { success: false, error: 'Cannot delete yourself or unauthorized' };
    }

    setLoading(true);

    try {
      // Delete from auth (this will cascade to profiles due to foreign key)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        throw authError;
      }

      toast.success('User deleted successfully');
      await fetchUsers();
      return { success: true };
    } catch (err) {
      const errorMessage = parseErrorMessageWithCodes(err, 'user deletion');
      console.error('Error deleting user:', err);
      toast.error(`Failed to delete user: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Invite user via email
  const inviteUser = async (email: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin || !currentUser?.company_id) {
      return { success: false, error: 'Unauthorized' };
    }

    setLoading(true);

    try {
      // Check if user already exists or has pending invitation
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      const { data: existingInvitation } = await supabase
        .from('user_invitations')
        .select('id')
        .eq('email', email)
        .eq('company_id', currentUser.company_id)
        .eq('status', 'pending')
        .single();

      if (existingInvitation) {
        return { success: false, error: 'Invitation already sent to this email' };
      }

      // Create invitation
      const { error } = await supabase
        .from('user_invitations')
        .insert({
          email,
          role,
          company_id: currentUser.company_id,
          invited_by: currentUser.id,
        });

      if (error) {
        throw error;
      }

      // TODO: Send invitation email (would integrate with your email service)
      
      toast.success('User invitation sent successfully');
      await fetchInvitations();
      return { success: true };
    } catch (err) {
      const errorMessage = parseErrorMessageWithCodes(err, 'invitation');
      console.error('Error sending invitation:', err);
      toast.error(`Failed to send invitation: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Revoke invitation
  const revokeInvitation = async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) {
        throw error;
      }

      toast.success('Invitation revoked successfully');
      await fetchInvitations();
      return { success: true };
    } catch (err) {
      const errorMessage = parseErrorMessageWithCodes(err, 'invitation revocation');
      console.error('Error revoking invitation:', err);
      toast.error(`Failed to revoke invitation: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Accept invitation (for invited users)
  const acceptInvitation = async (token: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: invitation, error: fetchError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .single();

      if (fetchError || !invitation) {
        return { success: false, error: 'Invalid or expired invitation' };
      }

      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        await supabase
          .from('user_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);
        
        return { success: false, error: 'Invitation has expired' };
      }

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateError) {
        throw updateError;
      }

      return { success: true };
    } catch (err) {
      const errorMessage = parseErrorMessageWithCodes(err, 'invitation acceptance');
      console.error('Error accepting invitation:', err);
      return { success: false, error: errorMessage };
    }
  };

  // Get user statistics
  const getUserStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const pendingUsers = users.filter(u => u.status === 'pending').length;
    const inactiveUsers = users.filter(u => u.status === 'inactive').length;
    
    const adminUsers = users.filter(u => u.role === 'admin').length;
    const accountantUsers = users.filter(u => u.role === 'accountant').length;
    const stockManagerUsers = users.filter(u => u.role === 'stock_manager').length;
    const basicUsers = users.filter(u => u.role === 'user').length;

    const pendingInvitations = invitations.filter(i => i.status === 'pending').length;

    return {
      totalUsers,
      activeUsers,
      pendingUsers,
      inactiveUsers,
      adminUsers,
      accountantUsers,
      stockManagerUsers,
      basicUsers,
      pendingInvitations,
    };
  };

  // Load data on mount
  useEffect(() => {
    if (isAdmin && currentUser?.company_id) {
      fetchUsers();
      fetchInvitations();
    }
  }, [isAdmin, currentUser?.company_id]);

  return {
    users,
    invitations,
    loading,
    error,
    fetchUsers,
    fetchInvitations,
    createUser,
    updateUser,
    deleteUser,
    inviteUser,
    revokeInvitation,
    acceptInvitation,
    getUserStats,
  };
};

// Helper function to generate temporary password
const generateTemporaryPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export default useUserManagement;
