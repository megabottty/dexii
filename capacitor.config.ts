import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dexii.app',
  appName: 'Dexii',
  webDir: 'dist/dexii/browser',
  ios: {
    contentInset: 'automatic'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
