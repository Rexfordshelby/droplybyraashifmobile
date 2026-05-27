import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { DroplyLogo } from '@/components/brand/DroplyLogo';

export const Footer = forwardRef<HTMLElement>(function Footer(_, ref) {
  return (
    <footer ref={ref} className="border-t border-border bg-card">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <DroplyLogo size={32} wordmarkClassName="text-lg" />

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

          <p className="text-sm text-muted-foreground">
            Same-day parcel delivery for Mumbai
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            (c) {new Date().getFullYear()} Droply. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
});
