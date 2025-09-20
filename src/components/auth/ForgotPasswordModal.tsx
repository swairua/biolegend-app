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
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToSignIn?: () => void;
}

export function ForgotPasswordModal({ 
  open, 
  onOpenChange, 
  onSwitchToSignIn 
}: ForgotPasswordModalProps) {
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail()) {
      return;
    }

    const { error } = await resetPassword(email);
    
    if (!error) {
      setIsSuccess(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError('');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setEmail('');
    setEmailError('');
    setIsSuccess(false);
  };

  const handleBackToSignIn = () => {
    handleClose();
    onSwitchToSignIn?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {isSuccess ? 'Check Your Email' : 'Reset Password'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isSuccess 
              ? 'We sent a password reset link to your email'
              : 'Enter your email to receive a reset link'
            }
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-success-light flex items-center justify-center">
                <Mail className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm text-muted-foreground">
                If an account exists for {email}, you will receive a password reset link shortly.
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleBackToSignIn}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
              
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={handleInputChange}
                  className={`pl-10 ${emailError ? 'border-destructive' : ''}`}
                  disabled={loading}
                />
              </div>
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
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
                  Sending reset link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>

            {onSwitchToSignIn && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  onClick={onSwitchToSignIn}
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Back to sign in
                </Button>
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
