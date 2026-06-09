import { forwardRef } from 'react';
import { DROPLIX_LOGO_SRC } from '@/lib/brandAssets';
import { cn } from '@/lib/utils';

interface DroplixLogoProps {
  className?: string;
  size?: number;
  variant?: 'lockup' | 'mark';
  withWordmark?: boolean;
  wordmarkClassName?: string;
}

/**
 * Droplix brand logo.
 * Wrapped in forwardRef so it can be used inside Radix `asChild` triggers
 * (Sheet, Dialog, Dropdown) without losing the ref.
 */
export const DroplixLogo = forwardRef<HTMLSpanElement, DroplixLogoProps>(function DroplixLogo(
  { className, size = 36, variant = 'lockup', withWordmark = false, wordmarkClassName },
  ref,
) {
  if (variant === 'mark') {
    const frameWidth = Math.round(size * 1.72);
    const frameHeight = Math.round(size * 1.15);
    const imageHeight = Math.round(size * 2.05);

    return (
      <span
        ref={ref}
        aria-label="Droplix"
        className={cn('relative inline-flex shrink-0 overflow-hidden rounded-sm', wordmarkClassName, className)}
        style={{ width: frameWidth, height: frameHeight }}
      >
        <img
          src={DROPLIX_LOGO_SRC}
          alt="Droplix logo"
          className="absolute max-w-none object-contain"
          style={{
            height: imageHeight,
            width: 'auto',
            left: -Math.round(size * 0.26),
            top: -Math.round(size * 0.04),
          }}
        />
      </span>
    );
  }

  const displayHeight = Math.round(size * (withWordmark ? 1.55 : 1.45));

  return (
    <span ref={ref} className={cn('inline-flex shrink-0 items-center', wordmarkClassName, className)}>
      <img
        src={DROPLIX_LOGO_SRC}
        alt="Droplix logo"
        className="block h-auto max-w-none object-contain"
        style={{ height: displayHeight, width: 'auto' }}
      />
    </span>
  );
});
