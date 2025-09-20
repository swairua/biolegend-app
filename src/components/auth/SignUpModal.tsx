import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

interface SignUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToSignIn?: () => void;
}

export function SignUpModal({ 
  open, 
  onOpenChange, 
  onSwitchToSignIn 
}: SignUpModalProps) {
  const { signUp, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain uppercase, lowercase and number';
    }

    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const { error } = await signUp(formData.email, formData.password, formData.fullName);
    
    if (!error) {
      onOpenChange(false);
      setFormData({ email: '', password: '', confirmPassword: '', fullName: '' });
      setFormErrors({});
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Create Account
          </DialogTitle>
          <DialogDescription className="text-center">
            Sign up to get started with your account
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleInputChange('fullName')}
                className={`pl-10 ${formErrors.fullName ? 'border-destructive' : ''}`}
                disabled={loading}
              />
            </div>
            {formErrors.fullName && (
              <p className="text-sm text-destructive">{formErrors.fullName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
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
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={formData.password}
                onChange={handleInputChange('password')}
                className={`pl-10 pr-10 ${formErrors.password ? 'border-destructive' : ''}`}
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {formErrors.password && (
              <p className="text-sm text-destructive">{formErrors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                className={`pl-10 pr-10 ${formErrors.confirmPassword ? 'border-destructive' : ''}`}
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {formErrors.confirmPassword && (
              <p className="text-sm text-destructive">{formErrors.confirmPassword}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>

          {onSwitchToSignIn && (
            <div className="text-center text-sm">
              Already have an account?{' '}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={onSwitchToSignIn}
              >
                Sign in
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
