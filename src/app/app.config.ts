import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { TitleStrategy, provideRouter, withInMemoryScrolling } from '@angular/router';
import { DexiiTitleStrategy } from './core/a11y/dexii-title.strategy';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { isNativeApp } from './core/config/api-config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideBrowserGlobalErrorListeners(),
    // Links like /settings#settings-notifications land on that section (DEX-40).
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    { provide: TitleStrategy, useClass: DexiiTitleStrategy },
    provideServiceWorker('ngsw-worker.js', {
      // The native app ships its own bundle, so the PWA service worker is browser-only.
      enabled: isDevMode() === false && !isNativeApp(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
