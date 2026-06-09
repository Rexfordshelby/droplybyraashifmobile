export type AppPreferences = {
  compactCards: boolean;
  hapticTaps: boolean;
  smoothMotion: boolean;
};

const KEY = 'droplix:app_preferences';

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  compactCards: false,
  hapticTaps: true,
  smoothMotion: true,
};

export function readAppPreferences(): AppPreferences {
  if (typeof window === 'undefined') return DEFAULT_APP_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_APP_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;

    return {
      ...DEFAULT_APP_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export function writeAppPreferences(preferences: AppPreferences) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(preferences));
  applyAppPreferences(preferences);
}

export function applyAppPreferences(preferences = readAppPreferences()) {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.toggle('app-compact-cards', preferences.compactCards);
  document.documentElement.classList.toggle('app-smooth-motion', preferences.smoothMotion);
  document.documentElement.classList.toggle('app-reduced-motion', !preferences.smoothMotion);
}

export function triggerHapticTap(duration = 12) {
  if (typeof navigator === 'undefined') return;
  if (!readAppPreferences().hapticTaps) return;
  navigator.vibrate?.(duration);
}
