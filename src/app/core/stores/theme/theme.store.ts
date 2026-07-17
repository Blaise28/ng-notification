import { computed, inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'app-theme';
export interface ThemeState {
  theme: Theme;
}

export const ThemeStore = signalStore(
  { providedIn: 'root' },

  withState<ThemeState>({ theme: 'light' }),

  withComputed(({ theme }) => ({
    isDark: computed(() => theme() === 'dark'),
    isLight: computed(() => theme() === 'light'),
    activeMode: computed(() => theme()),
  })),

  withMethods((store) => {
    const platformId = inject(PLATFORM_ID);
    const isBrowser = isPlatformBrowser(platformId);
    let listenerRegistered = false;

    function applyTheme(theme: Theme): void {
      if (!isBrowser) {
        return;
      }

      const archTheme = theme == 'dark' ? 'resyst-dark' : 'resyst-light';
      document.documentElement.setAttribute('data-theme', archTheme);
    }

    function getStoredTheme(): Theme | null {
      if (!isBrowser) {
        return null;
      }

      const storedTheme = localStorage.getItem(THEME_KEY);
      return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
    }

    return {
      setTheme(theme: Theme): void {
        patchState(store, { theme });
        applyTheme(theme);
        if (isBrowser) {
          localStorage.setItem(THEME_KEY, theme);
        }
      },

      toggleTheme(): void {
        const next: Theme = store.theme() === 'dark' ? 'light' : 'dark';
        patchState(store, { theme: next });
        applyTheme(next);
        if (isBrowser) {
          localStorage.setItem(THEME_KEY, next);
        }
      },

      initialize(): void {
        if (!isBrowser) {
          return;
        }

        const stored = getStoredTheme();
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initial: Theme =
          stored === 'light' || stored === 'dark' ? stored : systemDark ? 'dark' : 'light';

        patchState(store, { theme: initial });
        applyTheme(initial);

        if (listenerRegistered) {
          return;
        }

        listenerRegistered = true;

        window
          .matchMedia('(prefers-color-scheme: dark)')
          .addEventListener('change', (e: MediaQueryListEvent) => {
            if (!getStoredTheme()) {
              const systemTheme: Theme = e.matches ? 'dark' : 'light';
              patchState(store, { theme: systemTheme });
              applyTheme(systemTheme);
            }
          });
      },
    };
  }),
);
