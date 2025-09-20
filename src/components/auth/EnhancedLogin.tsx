import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { BiolegendLogo } from '@/components/ui/biolegend-logo';
import { toast } from 'sonner';
import { handleAuthError } from '@/utils/authErrorHandler';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function EnhancedLogin() {
  const { signIn, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    const { error } = await signIn(formData.email, formData.password);

    if (error) {
      handleAuthError(error);
    } else {
      toast.success('Welcome to Biolegend Scientific!');
      navigate('/');
    }
    setSubmitting(false);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <BiolegendLogo size="xl" pixelSize={336} showText={false} />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold biolegend-brand">Biolegend Scientific Ltd</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in to access your business management system
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Tabs value={'login'}>
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-4">
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
                      disabled={submitting}
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
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange('password')}
                      className={`pl-10 pr-10 ${formErrors.password ? 'border-destructive' : ''}`}
                      disabled={submitting}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={submitting}
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
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>

                </div>
              </form>

            </TabsContent>

          </Tabs>

          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Contact your administrator if you need account access.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
