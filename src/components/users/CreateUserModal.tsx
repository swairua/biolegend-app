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
import { Loader2, Mail, User, Phone, Building, MapPin } from 'lucide-react';
import { UserRole } from '@/contexts/AuthContext';
import { CreateUserData } from '@/hooks/useUserManagement';

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateUser: (userData: CreateUserData) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
}

export function CreateUserModal({
  open,
  onOpenChange,
  onCreateUser,
  loading = false,
}: CreateUserModalProps) {
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    full_name: '',
    role: 'user',
    phone: '',
    department: '',
    position: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
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

    const result = await onCreateUser(formData);
    
    if (result.success) {
      handleClose();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData({
      email: '',
      full_name: '',
      role: 'user',
      phone: '',
      department: '',
      position: '',
    });
    setFormErrors({});
  };

  const handleInputChange = (field: keyof CreateUserData) => (
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
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to your organization with specific role and permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
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
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
