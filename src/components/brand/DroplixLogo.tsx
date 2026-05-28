import { forwardRef } from 'react';
import logo from '@/assets/droplix-logo.png';
import { cn } from '@/lib/utils';

interface DroplixLogoProps {
  className?: string;
  size?: number;
  withWordmark?: boolean;
  wordmarkClassName?: string;
}

/**
 * Droplix brand logo.
 * Wrapped in forwardRef so it can be used inside Radix `asChild` triggers
 * (Sheet, Dialog, Dropdown) without losing the ref.
 */
export const DroplixLogo = forwardRef<HTMLSpanElement, DroplixLogoProps>(function DroplixLogo(
  { className, size = 36, withWordmark = false, wordmarkClassName },
  ref,
) {
  const displayHeight = Math.round(size * (withWordmark ? 1.5 : 1.35));

  return (
    <span ref={ref} className={cn('inline-flex items-center', wordmarkClassName, className)}>
      <img
        src={logo}
        alt="Droplix logo"
        className="h-auto max-w-full object-contain"
        style={{ height: displayHeight, width: 'auto' }}
      />
    </span>
  );
});
