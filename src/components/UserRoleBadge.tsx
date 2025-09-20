import { Badge } from '@/components/ui/badge';
import { Shield, User, DollarSign, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function UserRoleBadge() {
  const { profile, isAdmin } = useAuth();

  if (!profile?.role) {
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/20">
        <User className="h-3 w-3 mr-1" />
        No Role
      </Badge>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3 w-3 mr-1" />;
      case 'accountant':
        return <DollarSign className="h-3 w-3 mr-1" />;
      case 'stock_manager':
        return <Package className="h-3 w-3 mr-1" />;
      default:
        return <User className="h-3 w-3 mr-1" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive-light text-destructive border-destructive/20';
      case 'accountant':
        return 'bg-primary-light text-primary border-primary/20';
      case 'stock_manager':
        return 'bg-warning-light text-warning border-warning/20';
      case 'user':
        return 'bg-success-light text-success border-success/20';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/20';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'accountant':
        return 'Accountant';
      case 'stock_manager':
        return 'Stock Manager';
      case 'user':
        return 'User';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  return (
    <Badge variant="outline" className={getRoleColor(profile.role)}>
      {getRoleIcon(profile.role)}
      {getRoleLabel(profile.role)}
      {isAdmin && <Shield className="h-3 w-3 ml-1" />}
    </Badge>
  );
}
