import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Mail, Send } from 'lucide-react';
import { UserRole } from '@/contexts/AuthContext';

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteUser: (email: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
}

export function InviteUserModal({
  open,
  onOpenChange,
  onInviteUser,
  loading = false,
}: InviteUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'user' as UserRole,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.role) {
      errors.role = 'Role is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const result = await onInviteUser(formData.email, formData.role);
    
    if (result.success) {
      handleClose();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData({
      email: '',
      role: 'user',
    });
    setFormErrors({});
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData(prev => ({ ...prev, role }));
    if (formErrors.role) {
      setFormErrors(prev => ({ ...prev, role: '' }));
    }
  };

  const roleOptions = [
    { value: 'user', label: 'User', description: 'Basic access to view and create quotations' },
    { value: 'stock_manager', label: 'Stock Manager', description: 'Manage inventory and stock movements' },
    { value: 'accountant', label: 'Accountant', description: 'Access to financial reports and records' },
    { value: 'admin', label: 'Administrator', description: 'Full access to all system features' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invitation email to a new user to join your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="user@company.com"
                value={formData.email}
                onChange={handleInputChange('email')}
                className={`pl-10 ${formErrors.email ? 'border-destructive' : ''}`}
                disabled={loading}
              />
            </div>
            {formErrors.email && (
              <p className="text-sm text-destructive">{formErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={handleRoleChange} disabled={loading}>
              <SelectTrigger className={formErrors.role ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.role && (
              <p className="text-sm text-destructive">{formErrors.role}</p>
            )}
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">What happens next?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• An invitation email will be sent to the user</li>
              <li>• They can click the link to create their account</li>
              <li>• Their account will be created with the selected role</li>
              <li>• The invitation expires in 7 days</li>
            </ul>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
