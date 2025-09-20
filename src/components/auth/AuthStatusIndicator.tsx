import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function AuthStatusIndicator() {
  const { loading, isAuthenticated, user } = useAuth();
  const [showIndicator, setShowIndicator] = useState(true);

  useEffect(() => {
    // Hide the indicator after 5 seconds when not loading
    if (!loading) {
      const timer = setTimeout(() => {
        setShowIndicator(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Don't show if hidden or if we're still loading for less than 2 seconds
  if (!showIndicator && !loading) {
    return null;
  }

  const getStatus = () => {
    if (loading) {
      return {
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        text: 'Authenticating...',
        variant: 'outline' as const,
        className: 'bg-primary-light text-primary border-primary/20'
      };
    }
    
    if (isAuthenticated && user) {
      return {
        icon: <CheckCircle className="h-3 w-3" />,
        text: `Signed in as ${user.email}`,
        variant: 'outline' as const,
        className: 'bg-success-light text-success border-success/20'
      };
    }
    
    return {
      icon: <Shield className="h-3 w-3" />,
      text: 'Not signed in',
      variant: 'outline' as const,
      className: 'bg-muted text-muted-foreground border-muted-foreground/20'
    };
  };

  const status = getStatus();

  return (
    <div className="fixed top-4 right-4 z-40">
      <Badge 
        variant={status.variant}
        className={`flex items-center space-x-2 px-3 py-1 shadow-sm ${status.className}`}
      >
        {status.icon}
        <span className="text-xs font-medium">{status.text}</span>
      </Badge>
    </div>
  );
}
