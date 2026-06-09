import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { DroplixLogo } from '@/components/brand/DroplixLogo';
import { DROPLIX_SUPPORT_EMAIL, DROPLIX_SUPPORT_MAILTO } from '@/lib/contact';

export const Footer = forwardRef<HTMLElement>(function Footer(_, ref) {
  return (
    <footer ref={ref} className="border-t border-border bg-card">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <DroplixLogo size={36} />

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

          <a
            href={DROPLIX_SUPPORT_MAILTO}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {DROPLIX_SUPPORT_EMAIL}
          </a>
        </div>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            (c) {new Date().getFullYear()} Droplix. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
});
