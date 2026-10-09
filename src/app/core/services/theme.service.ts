import { Injectable, signal, computed, effect } from '@angular/core';
import { getApiBaseUrl } from '../config/api-config';

export type ThemeMode =
  | 'pearl'
  | 'onyx'
  | 'girlie'
  | 'manly'
  | 'hippie'
  | 'gothic'
  | 'light'
  | 'dark'
  | 'highschool'
  | 'neutral'
  | 'custom';

export interface CustomThemeColors {
  bg: string;
  primary: string;
  accent: string;
}

export interface ThemePalette {
  bg: string;
  bgSecondary: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryHover: string;
  border: string;
  cardBg: string;
  accent: string;
}

/** A palette plus text-safe versions of the brand colours (see `withReadableText`). */
export interface ReadablePalette extends ThemePalette {
  /** `primary`, nudged until it reads at 4.5:1 on `bg`. Use for coloured text and links. */
  onBgPrimary: string;
  /** `accent`, nudged until it reads at 4.5:1 on `bg`. */
  onBgAccent: string;
  /** Red for destructive actions and errors, nudged until it reads on this theme. */
  danger: string;
  /** The keyboard focus ring colour that stands out on this background. */
  focusRing: string;
}

export interface ThemeDefinition {
  id: ThemeMode;
  name: string;
  description: string;
  /** 'light' themes get the pearl-style shimmer/UI touches; 'dark' themes get the onyx-style ones. */
  kind: 'light' | 'dark';
  colors: ThemePalette;
}

const THEME_DEFINITIONS: ThemeDefinition[] = [
  {
    id: 'pearl',
    name: 'Pearl',
    description: 'Classic Glamour Light with Soft Mauve Silk & Polished Gold',
    kind: 'light',
    colors: {
      bg: '#fffafa',
      bgSecondary: '#f5f3f4',
      text: '#4a374a',
      textSecondary: '#866386',
      primary: '#8d5e94',
      primaryHover: '#815688',
      border: '#e2d1e2',
      cardBg: '#ffffff',
      accent: '#d4af37'
    }
  },
  {
    id: 'onyx',
    name: 'Onyx',
    description: 'Midnight Slate Dark with Electric Indigo accents',
    kind: 'dark',
    colors: {
      bg: '#020617',
      bgSecondary: '#0f172a',
      text: '#f8fafc',
      textSecondary: '#94a3b8',
      primary: '#4f46e5',
      primaryHover: '#4338ca',
      border: '#1e293b',
      cardBg: '#0f172a',
      accent: '#6366f1'
    }
  },
  {
    id: 'girlie',
    name: 'Girlie',
    description: 'Blush pink, sparkly and sweet',
    kind: 'light',
    colors: {
      bg: '#fff5f8',
      bgSecondary: '#ffe8f0',
      text: '#5a2a45',
      textSecondary: '#a2507a',
      primary: '#cf1571',
      primaryHover: '#bc1367',
      border: '#fbcfe8',
      cardBg: '#ffffff',
      accent: '#f9a8d4'
    }
  },
  {
    id: 'manly',
    name: 'Rugged',
    description: 'Steel, denim & leather - bold and grounded',
    kind: 'dark',
    colors: {
      bg: '#1c1f24',
      bgSecondary: '#262b32',
      text: '#eef1f5',
      textSecondary: '#9aa5b1',
      primary: '#3b6ea5',
      primaryHover: '#2f5a89',
      border: '#3a4048',
      cardBg: '#22262c',
      accent: '#c0752f'
    }
  },
  {
    id: 'hippie',
    name: 'Hippie Gardener',
    description: 'Earthy greens & warm terracotta, grown from the garden',
    kind: 'light',
    colors: {
      bg: '#f6f3e7',
      bgSecondary: '#eae4cf',
      text: '#3f4a2f',
      textSecondary: '#5f6a47',
      primary: '#526d3c',
      primaryHover: '#4b6337',
      border: '#d8cfa8',
      cardBg: '#fffdf6',
      accent: '#c97b3d'
    }
  },
  {
    id: 'gothic',
    name: 'Gothic',
    description: 'Black lace, deep wine & moonlit drama',
    kind: 'dark',
    colors: {
      bg: '#0b0509',
      bgSecondary: '#160a12',
      text: '#f1e6ea',
      textSecondary: '#a98d97',
      primary: '#8f1d3a',
      primaryHover: '#711530',
      border: '#2b1720',
      cardBg: '#160a12',
      accent: '#7c3aed'
    }
  },
  {
    id: 'light',
    name: 'Clean Light',
    description: 'Simple, crisp and minimal - no frills',
    kind: 'light',
    colors: {
      bg: '#ffffff',
      bgSecondary: '#f4f4f5',
      text: '#18181b',
      textSecondary: '#6f6f77',
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      border: '#e4e4e7',
      cardBg: '#ffffff',
      accent: '#0ea5e9'
    }
  },
  {
    id: 'dark',
    name: 'Clean Dark',
    description: 'Simple, crisp and minimal - true black & white',
    kind: 'dark',
    colors: {
      bg: '#0a0a0a',
      bgSecondary: '#171717',
      text: '#fafafa',
      textSecondary: '#a1a1aa',
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      border: '#27272a',
      cardBg: '#171717',
      accent: '#0ea5e9'
    }
  },
  {
    id: 'highschool',
    name: 'Locker Room',
    description: 'Y2K bubblegum pink & purple - loud and fun',
    kind: 'light',
    colors: {
      bg: '#fdf4ff',
      bgSecondary: '#fae8ff',
      text: '#581c87',
      textSecondary: '#942ef5',
      primary: '#b612cf',
      primaryHover: '#a510bc',
      border: '#f0abfc',
      cardBg: '#ffffff',
      accent: '#22d3ee'
    }
  },
  {
    id: 'neutral',
    name: 'Sandstone',
    description: 'Warm neutral tones that work for anyone',
    kind: 'light',
    colors: {
      bg: '#faf7f2',
      bgSecondary: '#f0ebe1',
      text: '#3a352e',
      textSecondary: '#71695d',
      primary: '#866346',
      primaryHover: '#7a5a40',
      border: '#e3dccb',
      cardBg: '#ffffff',
      accent: '#5f7470'
    }
  }
];

const THEME_MAP = new Map<ThemeMode, ThemeDefinition>(THEME_DEFINITIONS.map((def) => [def.id, def]));

const CUSTOM_COLORS_KEY = 'dexii_custom_theme_colors';
const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
  bg: '#fdf6f0',
  primary: '#e0796b',
  accent: '#3d8f89'
};

function clamp(value: number, min = 0, max = 255): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const normalized = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const int = parseInt(normalized, 16) || 0;
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(Math.round(n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Mixes two hex colors together; weight 0 = all colorA, 1 = all colorB. */
function mix(colorA: string, colorB: string, weight: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  return rgbToHex(
    a.r + (b.r - a.r) * weight,
    a.g + (b.g - a.g) * weight,
    a.b + (b.b - a.b) * weight
  );
}

/** WCAG relative luminance (0-1). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colours (1-21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Moves `fg` towards black (on light backgrounds) or white (on dark ones) in
 * small steps until it reads at `minRatio` on `bg`. Colours that already pass
 * come back untouched, so themes that were fine don't change.
 */
export function readableOn(fg: string, bg: string, minRatio = 4.5): string {
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  const towards = relativeLuminance(bg) > 0.4 ? '#000000' : '#ffffff';
  for (let weight = 0.05; weight <= 1; weight += 0.05) {
    const candidate = mix(fg, towards, weight);
    if (contrastRatio(candidate, bg) >= minRatio) return candidate;
  }
  return towards;
}

/** Like `readableOn`, but the colour has to read on every surface text can sit on. */
export function readableOnAll(fg: string, surfaces: string[], minRatio = 4.5): string {
  let out = fg;
  for (let pass = 0; pass < 3; pass++) {
    for (const surface of surfaces) out = readableOn(out, surface, minRatio);
    if (surfaces.every((surface) => contrastRatio(out, surface) >= minRatio)) break;
  }
  return out;
}

/** Adds the text-safe colours and focus ring to a palette. */
export function withReadableText(palette: ThemePalette): ReadablePalette {
  // Every surface body text sits on, including the 8% primary tint used for selected cards.
  const surfaces = [palette.bg, palette.bgSecondary, palette.cardBg, mix(palette.bgSecondary, palette.primary, 0.08)];
  return {
    ...palette,
    text: readableOnAll(palette.text, surfaces),
    textSecondary: readableOnAll(palette.textSecondary, surfaces),
    onBgPrimary: readableOnAll(palette.primary, surfaces),
    onBgAccent: readableOnAll(palette.accent, surfaces),
    danger: readableOnAll('#ef4444', surfaces),
    focusRing: relativeLuminance(palette.bg) > 0.4 ? '#b45309' : '#fbbf24'
  };
}

/** Perceived brightness (0-255); above ~140 is considered a "light" background. */
function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/** Builds a full, readable palette from just a background, primary, and accent color. */
function buildCustomPalette(custom: CustomThemeColors): ThemePalette {
  const isLight = luminance(custom.bg) >= 140;
  const text = isLight ? mix(custom.bg, '#000000', 0.82) : mix(custom.bg, '#ffffff', 0.9);
  const textSecondary = isLight ? mix(custom.bg, '#000000', 0.62) : mix(custom.bg, '#ffffff', 0.68);
  const bgSecondary = isLight ? mix(custom.bg, '#000000', 0.05) : mix(custom.bg, '#ffffff', 0.07);
  const border = isLight ? mix(custom.bg, '#000000', 0.14) : mix(custom.bg, '#ffffff', 0.18);
  const cardBg = isLight ? mix(custom.bg, '#ffffff', 0.6) : mix(custom.bg, '#ffffff', 0.05);
  const primaryHover = mix(custom.primary, '#000000', 0.18);

  return {
    bg: custom.bg,
    bgSecondary,
    text,
    textSecondary,
    primary: custom.primary,
    primaryHover,
    border,
    cardBg,
    accent: custom.accent
  };
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'dexii_theme';
  private readonly apiBaseUrl = getApiBaseUrl();
  private readonly tokenStorageKey = 'dexii_api_token';
  private _mode = signal<ThemeMode>(this.getInitialMode());
  private _customColors = signal<CustomThemeColors>(this.getInitialCustomColors());
  private _hydratedOwner: string | null = null;
  public mode = this._mode.asReadonly();
  public customColors = this._customColors.asReadonly();
  public themes = THEME_DEFINITIONS;

  public activeThemeDefinition = computed<ThemeDefinition | null>(() =>
    this._mode() === 'custom' ? null : (THEME_MAP.get(this._mode()) || THEME_DEFINITIONS[0])
  );

  public colors = computed<ReadablePalette>(() => {
    if (this._mode() === 'custom') {
      return withReadableText(buildCustomPalette(this._customColors()));
    }
    return withReadableText((THEME_MAP.get(this._mode()) || THEME_DEFINITIONS[0]).colors);
  });

  /** Keeps the global focus ring and danger colour (styles.css) readable on the current theme. */
  private readonly cssVarSync = effect(() => {
    if (typeof document === 'undefined') return;
    const colors = this.colors();
    document.documentElement.style.setProperty('--focus-ring', colors.focusRing);
    document.documentElement.style.setProperty('--danger', colors.danger);
  });

  public isPearl = computed(() => {
    if (this._mode() === 'custom') {
      return luminance(this._customColors().bg) >= 140;
    }
    return this.activeThemeDefinition()?.kind === 'light';
  });
  public isOnyx = computed(() => !this.isPearl());

  private getInitialMode(): ThemeMode {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(this.storageKey) : null;
    if (saved === 'custom' || (saved && THEME_MAP.has(saved as ThemeMode))) {
      return saved as ThemeMode;
    }
    // Legacy fallback for old 'dark'/'light' localStorage values pre-dating the expanded theme list.
    if (saved === 'dark') return 'onyx';
    if (saved === 'light') return 'pearl';
    return 'pearl';
  }

  private getInitialCustomColors(): CustomThemeColors {
    if (typeof localStorage === 'undefined') return DEFAULT_CUSTOM_COLORS;
    try {
      const raw = localStorage.getItem(CUSTOM_COLORS_KEY);
      if (!raw) return DEFAULT_CUSTOM_COLORS;
      const parsed = JSON.parse(raw);
      if (parsed?.bg && parsed?.primary && parsed?.accent) {
        return parsed;
      }
    } catch {
      // fall through to default
    }
    return DEFAULT_CUSTOM_COLORS;
  }

  setTheme(mode: ThemeMode, options: { sync?: boolean } = {}) {
    const normalized: ThemeMode = (mode === 'custom' || THEME_MAP.has(mode)) ? mode : 'pearl';
    this._mode.set(normalized);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, normalized);
    }
    if (options.sync !== false) {
      void this.persistThemeToBackend(normalized, this._customColors());
    }
  }

  setMode(mode: ThemeMode) {
    this.setTheme(mode);
  }

  /** Saves the user's three hand-picked colors and switches to Custom theme mode. */
  setCustomColors(customColors: CustomThemeColors) {
    this._customColors.set(customColors);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(customColors));
    }
    // setTheme() below already syncs the mode+colors together, so it
    // covers persisting these custom colors - no need to sync twice.
    this.setTheme('custom');
  }

  toggleTheme() {
    const next: ThemeMode = this.isOnyx() ? 'pearl' : 'onyx';
    this.setTheme(next);
  }

  /**
   * Pulls the signed-in user's saved theme choice from the backend so it
   * follows them to a new browser/device, instead of each browser only ever
   * seeing whatever was in its own localStorage. Safe to call repeatedly
   * (e.g. once per login) - it only applies the remote value once per owner
   * and is a no-op while logged out / offline.
   */
  async hydrateFromBackend(owner: string): Promise<void> {
    if (!owner || this._hydratedOwner === owner) return;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem(this.tokenStorageKey) : null;
    if (!token) return;

    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/me`, {
        headers: { 'x-auth-token': token }
      });
      if (!response.ok) return;

      const profile = await response.json();
      const pref = profile?.themePreference;
      this._hydratedOwner = owner;
      if (!pref?.mode) return;

      if (pref.mode === 'custom' && pref.customColors?.bg && pref.customColors?.primary && pref.customColors?.accent) {
        this._customColors.set(pref.customColors);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(pref.customColors));
        }
      }
      // sync: false - this value just came from the backend, so writing it
      // straight back would be a redundant round-trip.
      this.setTheme(pref.mode as ThemeMode, { sync: false });
    } catch {
      // Offline/network failure - keep whatever's in localStorage already.
    }
  }

  private async persistThemeToBackend(mode: ThemeMode, customColors: CustomThemeColors): Promise<void> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem(this.tokenStorageKey) : null;
    if (!token) return;

    try {
      await fetch(`${this.apiBaseUrl}/auth/theme`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ mode, customColors: mode === 'custom' ? customColors : undefined })
      });
    } catch {
      // Offline/network failure - theme still works locally via localStorage;
      // it'll just stay unsynced until the next successful save.
    }
  }
}
