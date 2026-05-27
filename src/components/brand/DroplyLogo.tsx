import { forwardRef } from 'react';
import logo from '@/assets/droply-logo.png';
import { cn } from '@/lib/utils';

interface DroplyLogoProps {
  className?: string;
  size?: number;
  withWordmark?: boolean;
  wordmarkClassName?: string;
}

/**
 * Droply brand logo. Renders the logo mark plus the wordmark.
 * Wrapped in forwardRef so it can be used inside Radix `asChild` triggers
 * (Sheet, Dialog, Dropdown) without losing the ref.
 */
export const DroplyLogo = forwardRef<HTMLSpanElement, DroplyLogoProps>(function DroplyLogo(
  { className, size = 36, withWordmark = false, wordmarkClassName },
  ref,
) {
  if (withWordmark) {
    return (
      <span ref={ref} className={cn('inline-flex items-center', className)}>
        <img
          src={logo}
          alt="Droply"
          width={size * 3}
          height={size}
          className="object-contain"
          style={{ height: size }}
        />
      </span>
    );
  }

  return (
    <span ref={ref} className={cn('inline-flex items-center gap-2', className)}>
      <img
        src={logo}
        alt="Droply logo"
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
      />
      <span className={cn('font-heading font-bold text-primary', wordmarkClassName)}>
        Droply
      </span>
    </span>
  );
});
