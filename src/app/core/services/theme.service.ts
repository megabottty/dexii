import { Injectable, signal, computed } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

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

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private _mode = signal<ThemeMode>('dark');
  public mode = this._mode.asReadonly();

  public colors = computed<ThemePalette>(() => {
    if (this._mode() === 'dark') {
      return {
        bg: '#020617', // Slate 950
        bgSecondary: '#0f172a', // Slate 900
        text: '#f8fafc', // Slate 50
        textSecondary: '#94a3b8', // Slate 400
        primary: '#4f46e5', // Indigo 600
        primaryHover: '#4338ca', // Indigo 700
        border: '#1e293b', // Slate 800
        cardBg: '#0f172a',
        accent: '#6366f1'
      };
    } else {
      return {
        bg: '#fffafa', // Pearl White
        bgSecondary: '#f5f3f4', // Soft Stone
        text: '#4a374a', // Deep Plum/Mauve Charcoal
        textSecondary: '#9d7a9d', // Dusty Mauve
        primary: '#a881af', // Classic Glamour Mauve
        primaryHover: '#8e6695', // Deeper Mauve
        border: '#e2d1e2', // Soft Mauve Silk
        cardBg: '#ffffff',
        accent: '#d4af37' // Polished Gold
      };
    }
  });

  toggleTheme() {
    this._mode.update(m => m === 'dark' ? 'light' : 'dark');
  }
}
