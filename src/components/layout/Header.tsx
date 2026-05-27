import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Menu, User, LogOut, Send, Bike, Home, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { DroplyLogo } from '@/components/brand/DroplyLogo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export function Header() {
  const { user, signOut, hasRole } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = hasRole('admin');
  const isRider = hasRole('rider');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/30 dark:border-white/10 bg-card/60 backdrop-blur-xl supports-[backdrop-filter]:bg-card/40">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <DroplyLogo size={36} wordmarkClassName="text-xl hidden sm:block" />
          </Link>

          {/* Desktop Quick Actions */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/dashboard">
                <Button variant={isActive('/dashboard') ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  My Orders
                </Button>
              </Link>
              <Link to="/send">
                <Button variant={isActive('/send') ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                  <Send className="h-4 w-4" />
                  Send Parcel
                </Button>
              </Link>
              {isRider && (
                <Link to="/rider">
                  <Button variant={isActive('/rider') ? 'secondary' : 'ghost'} size="sm" className="gap-2 text-emerald-600">
                    <Bike className="h-4 w-4" />
                    Rider Mode
                  </Button>
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin">
                  <Button
                    variant={isActive('/admin') ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2 text-primary"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Admin Panel
                  </Button>
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Desktop Right Side */}
        <nav className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {/* Become Rider CTA - only show if not already a rider */}
              {!isRider && (
                <Link to="/become-rider">
                  <Button variant="outline" size="sm" className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
                    <Bike className="h-4 w-4" />
                    Earn Money
                  </Button>
                </Link>
              )}
              
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        variant="destructive"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-popover">
                  <div className="p-2">
                    <p className="text-sm font-medium">Notifications</p>
                    {unreadCount === 0 ? (
                      <p className="text-sm text-muted-foreground mt-2">No new notifications</p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">{unreadCount} unread</p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/notifications" className="w-full">View all</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Profile Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">Admin Panel</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button size="sm" className="btn-gradient">Get Started</Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Navigation */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] bg-background">
            <div className="flex items-center gap-2 mb-8">
              <DroplyLogo size={36} wordmarkClassName="text-xl" />
            </div>
            
            <nav className="flex flex-col gap-2">
              {user ? (
                <>
                  {/* Primary Actions */}
                  <Link 
                    to="/send" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground font-medium"
                  >
                    <Send className="h-5 w-5" />
                    Send Parcel
                  </Link>
                  
                  <Link 
                    to="/dashboard" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    My Orders
                  </Link>
                  
                  {/* Rider Section */}
                  {isRider ? (
                    <Link 
                      to="/rider" 
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                    >
                      <Bike className="h-5 w-5" />
                      Rider Dashboard
                    </Link>
                  ) : (
                    <Link 
                      to="/become-rider" 
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors border border-dashed border-primary/50"
                    >
                      <Bike className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-primary">Become a Rider</p>
                        <p className="text-xs text-muted-foreground">Earn money delivering</p>
                      </div>
                    </Link>
                  )}

                  <div className="border-t my-4" />
                  
                  <Link 
                    to="/notifications" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Bell className="h-5 w-5" />
                    Notifications
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-auto">{unreadCount}</Badge>
                    )}
                  </Link>
                  
                  <Link 
                    to="/profile" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <User className="h-5 w-5" />
                    Profile
                  </Link>

                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 text-primary font-medium transition-colors hover:bg-primary/15"
                    >
                      <ShieldCheck className="h-5 w-5" />
                      Admin Panel
                    </Link>
                  )}
                  
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      handleSignOut();
                      setMobileOpen(false);
                    }}
                    className="mt-4"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link 
                    to="/" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Home className="h-5 w-5" />
                    Home
                  </Link>
                  <Link 
                    to="/become-rider" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Bike className="h-5 w-5" />
                    Become a Rider
                  </Link>
                  <div className="border-t my-4" />
                  <Link 
                    to="/auth" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link to="/auth?tab=signup" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full btn-gradient">Get Started</Button>
                  </Link>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
