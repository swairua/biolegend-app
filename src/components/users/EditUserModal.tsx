import { useState, useEffect } from 'react';
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
import { Loader2, User, Phone, Building, MapPin } from 'lucide-react';
import { UserProfile, UserRole, UserStatus } from '@/contexts/AuthContext';
import { UpdateUserData } from '@/hooks/useUserManagement';

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onUpdateUser: (userId: string, userData: UpdateUserData) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
}

export function EditUserModal({
  open,
  onOpenChange,
  user,
  onUpdateUser,
  loading = false,
}: EditUserModalProps) {
  const [formData, setFormData] = useState<UpdateUserData>({
    full_name: '',
    role: 'user',
    status: 'active',
    phone: '',
    department: '',
    position: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        role: user.role,
        status: user.status,
        phone: user.phone || '',
        department: user.department || '',
        position: user.position || '',
      });
    }
  }, [user]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.full_name?.trim()) {
      errors.full_name = 'Full name is required';
    }

    if (!formData.role) {
      errors.role = 'Role is required';
    }

    if (!formData.status) {
      errors.status = 'Status is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !validateForm()) {
      return;
    }

    const result = await onUpdateUser(user.id, formData);
    
    if (result.success) {
      handleClose();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormErrors({});
  };

  const handleInputChange = (field: keyof UpdateUserData) => (
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

  const handleStatusChange = (status: UserStatus) => {
    setFormData(prev => ({ ...prev, status }));
    if (formErrors.status) {
      setFormErrors(prev => ({ ...prev, status: '' }));
    }
  };

  const roleOptions = [
    { value: 'user', label: 'User', description: 'Basic access to view and create quotations' },
    { value: 'stock_manager', label: 'Stock Manager', description: 'Manage inventory and stock movements' },
    { value: 'accountant', label: 'Accountant', description: 'Access to financial reports and records' },
    { value: 'admin', label: 'Administrator', description: 'Full access to all system features' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active', description: 'User can sign in and access the system' },
    { value: 'inactive', label: 'Inactive', description: 'User cannot sign in' },
    { value: 'pending', label: 'Pending', description: 'User account is pending activation' },
  ];

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information, role, and status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="full_name"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={handleInputChange('full_name')}
                className={`pl-10 ${formErrors.full_name ? 'border-destructive' : ''}`}
                disabled={loading}
              />
            </div>
            {formErrors.full_name && (
              <p className="text-sm text-destructive">{formErrors.full_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={user.email}
              disabled
              className="bg-muted text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed after account creation
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={handleStatusChange} disabled={loading}>
                <SelectTrigger className={formErrors.status ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.status && (
                <p className="text-sm text-destructive">{formErrors.status}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={handleInputChange('phone')}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="department"
                  placeholder="Sales, IT, Finance..."
                  value={formData.department}
                  onChange={handleInputChange('department')}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="position"
                placeholder="Manager, Developer, Analyst..."
                value={formData.position}
                onChange={handleInputChange('position')}
                className="pl-10"
                disabled={loading}
              />
            </div>
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
                  Updating...
                </>
              ) : (
                'Update User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
