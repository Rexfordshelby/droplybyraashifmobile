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
  const navButtonClass = (path: string, tone = '') =>
    `h-10 rounded-md px-3 ${isActive(path) ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' : 'text-muted-foreground hover:text-foreground'} ${tone}`;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-card/90">
      <div className="container flex h-[68px] items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <DroplyLogo size={36} wordmarkClassName="text-xl hidden sm:block" />
          </Link>

          {user && (
            <nav className="hidden items-center gap-1 rounded-lg border bg-background/70 p-1 md:flex">
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

        <nav className="hidden md:flex items-center gap-2">
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
                <Button variant="ghost" size="sm" className="h-10">Sign In</Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button size="sm" className="btn-gradient h-10">Get Started</Button>
              </Link>
            </>
          )}
        </nav>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="rounded-md">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] border-l bg-background p-5">
            <div className="flex items-center gap-2 mb-8">
              <DroplyLogo size={36} wordmarkClassName="text-xl" />
            </div>
            
            <nav className="flex flex-col gap-2">
              {user ? (
                <>
                  <Link 
                    to="/send" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-md bg-primary p-3 font-semibold text-primary-foreground shadow-sm"
                  >
                    <Send className="h-5 w-5" />
                    Send Parcel
                  </Link>
                  
                  <Link 
                    to="/dashboard" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-md p-3 font-medium transition-colors hover:bg-secondary"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    My Orders
                  </Link>
                  
                  {isRider ? (
                    <Link 
                      to="/rider" 
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-md bg-emerald-500/10 p-3 font-semibold text-emerald-700 dark:text-emerald-300"
                    >
                      <Bike className="h-5 w-5" />
                      Rider Dashboard
                    </Link>
                  ) : (
                    <Link 
                      to="/become-rider" 
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-md border border-dashed border-primary/50 p-3 transition-colors hover:bg-primary/10"
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
                    className="flex items-center gap-3 rounded-md p-3 font-medium transition-colors hover:bg-secondary"
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
                    className="flex items-center gap-3 rounded-md p-3 font-medium transition-colors hover:bg-secondary"
                  >
                    <User className="h-5 w-5" />
                    Profile
                  </Link>

                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-md bg-primary/10 p-3 font-semibold text-primary transition-colors hover:bg-primary/15"
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
                    className="flex items-center gap-3 rounded-md p-3 font-medium transition-colors hover:bg-secondary"
                  >
                    <Home className="h-5 w-5" />
                    Home
                  </Link>
                  <Link 
                    to="/become-rider" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-md p-3 font-medium transition-colors hover:bg-secondary"
                  >
                    <Bike className="h-5 w-5" />
                    Become a Rider
                  </Link>
                  <div className="border-t my-4" />
                  <Link 
                    to="/auth" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-md p-3 font-medium transition-colors hover:bg-secondary"
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
