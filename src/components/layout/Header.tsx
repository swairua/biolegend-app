import { useState } from 'react';
import { Bell, Search, User, LogOut, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { SignInModal } from '@/components/auth/SignInModal';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';

export function Header() {
  const { user, profile, signOut, isAuthenticated } = useAuth();
  const [authModal, setAuthModal] = useState<'signin' | 'forgot' | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleDisplay = (role: string) => {
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
        return 'User';
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

  const handleAuthModalSwitch = (modal: 'signin' | 'forgot') => {
    setAuthModal(modal);
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 shadow-card">
        {/* Search */}
        <div className="flex items-center space-x-4 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customers, invoices, products..."
              className="pl-10 bg-muted/50 border-muted focus:bg-background transition-smooth"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {isAuthenticated && (
            <>
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-xs text-destructive-foreground flex items-center justify-center">
                  3
                </span>
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-3 px-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                        {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">
                        {profile?.full_name || user?.email || 'User'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">
                          {profile?.role ? getRoleDisplay(profile.role) : 'User'}
                        </span>
                        {profile?.role && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-1 py-0 h-4 ${getRoleColor(profile.role)}`}
                          >
                            {profile.role.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">
                        {profile?.full_name || user?.email || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  {profile?.role === 'admin' && (
                    <DropdownMenuItem>
                      Company Settings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer"
                    onClick={signOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {!isAuthenticated && (
            <div className="flex items-center space-x-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setAuthModal('signin')}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Auth Modals */}
      <SignInModal
        open={authModal === 'signin'}
        onOpenChange={(open) => !open && setAuthModal(null)}
        onSwitchToForgotPassword={() => handleAuthModalSwitch('forgot')}
      />

      <ForgotPasswordModal
        open={authModal === 'forgot'}
        onOpenChange={(open) => !open && setAuthModal(null)}
        onSwitchToSignIn={() => handleAuthModalSwitch('signin')}
      />
    </>
  );
}
