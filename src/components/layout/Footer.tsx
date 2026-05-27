import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { DroplyLogo } from '@/components/brand/DroplyLogo';

export const Footer = forwardRef<HTMLElement>(function Footer(_, ref) {
  return (
    <footer ref={ref} className="border-t border-border bg-card">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Brand */}
          <DroplyLogo size={32} wordmarkClassName="text-lg" />

          {/* Quick Links */}
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/send" className="text-muted-foreground hover:text-foreground transition-colors">
              Send Parcel
            </Link>
            <Link to="/become-rider" className="text-muted-foreground hover:text-foreground transition-colors">
              Become a Rider
            </Link>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> in India
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Droply. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
});