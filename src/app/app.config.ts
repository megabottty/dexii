import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { InMemoryScrollingOptions, TitleStrategy, provideRouter, withInMemoryScrolling } from '@angular/router';
import { DexiiTitleStrategy } from './core/a11y/dexii-title.strategy';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { isNativeApp } from './core/config/api-config';

/**
 * How the router scrolls the page.
 * - anchorScrolling: links like /settings#settings-notifications land on that section (DEX-40).
 * - scrollPositionRestoration: each new page opens at the top, and Back returns you to where
 *   you were. Without it, opening a crush from a scrolled-down Stash kept the Stash's scroll
 *   position, so the profile opened partway down (DEX-75).
 */
export const ROUTER_SCROLLING: InMemoryScrollingOptions = { anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' };

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling(ROUTER_SCROLLING)),
    { provide: TitleStrategy, useClass: DexiiTitleStrategy },
    provideServiceWorker('ngsw-worker.js', {
      // The native app ships its own bundle, so the PWA service worker is browser-only.
      enabled: isDevMode() === false && !isNativeApp(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
