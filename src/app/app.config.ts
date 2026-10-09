import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { TitleStrategy, provideRouter } from '@angular/router';
import { DexiiTitleStrategy } from './core/a11y/dexii-title.strategy';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { isNativeApp } from './core/config/api-config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: DexiiTitleStrategy },
    provideServiceWorker('ngsw-worker.js', {
      // The native app ships its own bundle, so the PWA service worker is browser-only.
      enabled: isDevMode() === false && !isNativeApp(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
