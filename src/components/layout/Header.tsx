import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Menu, User, LogOut, Send, Bike, Home, LayoutDashboard, ShieldCheck, Store } from 'lucide-react';
import { DroplixLogo } from '@/components/brand/DroplixLogo';
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
  const navButtonClass = (path: string, tone = '') =>
    `h-11 rounded-[10px] px-3 ${isActive(path) ? 'bg-foreground text-background shadow-sm hover:bg-foreground/90' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'} ${tone}`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border-soft)] bg-white/94 backdrop-blur-xl supports-[backdrop-filter]:bg-white/88">
      <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex min-h-11 min-w-11 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <DroplixLogo variant="mark" size={40} className="sm:hidden" />
            <DroplixLogo size={46} className="hidden sm:inline-flex" />
          </Link>

          {user && (
            <nav className="hidden items-center gap-1 rounded-2xl border bg-[var(--soft-background)] p-1 md:flex">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className={navButtonClass('/dashboard')}>
                  <LayoutDashboard className="h-4 w-4" />
                  Orders
                </Button>
              </Link>
              <Link to="/send">
                <Button variant="ghost" size="sm" className={navButtonClass('/send')}>
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </Link>
              <Link to="/business/dashboard">
                <Button variant="ghost" size="sm" className={navButtonClass('/business/dashboard')}>
                  <Store className="h-4 w-4" />
                  Store
                </Button>
              </Link>
              {isRider && (
                <Link to="/rider">
                  <Button variant="ghost" size="sm" className={navButtonClass('/rider', isActive('/rider') ? '' : 'text-emerald-700')}>
                    <Bike className="h-4 w-4" />
                    Rider
                  </Button>
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={navButtonClass('/admin', isActive('/admin') ? '' : 'text-primary')}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              )}
            </nav>
          )}
        </div>

        <nav className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              {!isRider && (
                <Link to="/become-rider">
                  <Button variant="outline" size="sm" className="h-10 gap-2 border-primary/40 text-primary hover:bg-primary/10">
                    <Bike className="h-4 w-4" />
                    Earn Money
                  </Button>
                </Link>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-md">
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
                <DropdownMenuContent align="end" className="w-80 border bg-popover shadow-xl">
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-md">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border bg-popover shadow-xl">
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
                <Button variant="ghost" size="sm" className="home-nav-link">Sign In</Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button size="sm" className="home-nav-primary">Get Started</Button>
              </Link>
              <Link to="/business">
                <Button variant="outline" size="sm" className="home-nav-secondary gap-2">
                  <Store className="h-4 w-4" />
                  Business
                </Button>
              </Link>
            </>
          )}
        </nav>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-[10px] text-[var(--heading)] hover:bg-[var(--soft-background)]">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[310px] border-l bg-background/95 p-5 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center gap-2 mb-8">
              <DroplixLogo size={42} />
            </div>
            
            <nav className="flex flex-col gap-2">
              {user ? (
                <>
                  <Link 
                    to="/send" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-2xl bg-primary p-3 font-semibold text-primary-foreground shadow-sm"
                  >
                    <Send className="h-5 w-5" />
                    Send Parcel
                  </Link>
                  
                  <Link 
                    to="/dashboard" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-2xl p-3 font-medium transition-colors hover:bg-secondary"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    My Orders
                  </Link>

                  <Link
                    to="/business/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-2xl p-3 font-medium transition-colors hover:bg-secondary"
                  >
                    <Store className="h-5 w-5" />
                    Store Dashboard
                  </Link>
                  
                  {isRider ? (
                    <Link 
                      to="/rider" 
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-3 font-semibold text-emerald-700 dark:text-emerald-300"
                    >
                      <Bike className="h-5 w-5" />
                      Rider Dashboard
                    </Link>
                  ) : (
                    <Link 
                      to="/become-rider" 
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-2xl border border-dashed border-primary/50 p-3 transition-colors hover:bg-primary/10"
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
                    className="flex items-center gap-3 rounded-2xl p-3 font-medium transition-colors hover:bg-secondary"
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
                    className="flex items-center gap-3 rounded-2xl p-3 font-medium transition-colors hover:bg-secondary"
                  >
                    <User className="h-5 w-5" />
                    Profile
                  </Link>

                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-2xl bg-primary/10 p-3 font-semibold text-primary transition-colors hover:bg-primary/15"
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
                    className="flex items-center gap-3 rounded-2xl p-3 font-medium transition-colors hover:bg-secondary"
                  >
                    <Home className="h-5 w-5" />
                    Home
                  </Link>
                  <Link 
                    to="/become-rider" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-2xl p-3 font-medium transition-colors hover:bg-secondary"
                  >
                    <Bike className="h-5 w-5" />
                    Become a Rider
                  </Link>
                  <Link
                    to="/business"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-2xl p-3 font-medium transition-colors hover:bg-secondary"
                  >
                    <Store className="h-5 w-5" />
                    Business
                  </Link>
                  <div className="border-t my-4" />
                  <Link 
                    to="/auth" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-2xl p-3 font-medium transition-colors hover:bg-secondary"
                  >
                    Sign In
                  </Link>
                  <Link to="/auth?tab=signup" onClick={() => setMobileOpen(false)}>
                    <Button className="home-nav-primary w-full">Get Started</Button>
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
